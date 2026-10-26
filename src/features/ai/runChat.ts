import { stepCountIs, streamText } from 'ai';
import type { AnalysisContext } from '@/features/analysis/types';
import { newId } from '@/domain/document';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useApiKeyStore } from './apiKeys';
import { buildAppState } from './appState';
import { updateItem, useAiStore } from './aiStore';
import { buildSystemPrompt } from './prompt';
import { aiProviders } from './providers';
import { createAiTools } from './tools';

const MAX_STEPS = 6;

function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/401|403|API key|api_key|invalid.*key/i.test(msg))
    return `API キーが正しくないか、権限がありません。設定を確認してください。(${msg})`;
  if (/429|quota|rate/i.test(msg))
    return `利用上限(無料枠など)に達しました。しばらく待ってから再度お試しください。(${msg})`;
  if (/404|not found|model/i.test(msg))
    return `モデルが見つかりません。設定でモデルを選び直してください。(${msg})`;
  return msg;
}

/** ユーザーの発言を送り、ストリーミングで応答を受け取る */
export async function sendMessage(text: string, getCtx: () => AnalysisContext | null) {
  const settings = useSettingsStore.getState().settings;
  const provider = aiProviders[settings.ai.provider];
  const apiKey = useApiKeyStore.getState().keys[provider.id];
  const ctx = getCtx();
  if (!apiKey || !ctx || useAiStore.getState().busy) return;

  const userItem = { id: newId(), role: 'user' as const, text, tools: [], proposalIds: [] };
  const reply = { id: newId(), role: 'assistant' as const, text: '', tools: [], proposalIds: [] };
  const abort = new AbortController();
  const history = [...useAiStore.getState().history, { role: 'user' as const, content: text }];
  useAiStore.setState((s) => ({
    items: [...s.items, userItem, reply],
    busy: true,
    abort,
  }));

  try {
    const result = streamText({
      model: provider.createModel(apiKey, settings.ai[provider.modelSetting]),
      system: buildSystemPrompt(buildAppState(ctx, settings)),
      messages: history,
      tools: createAiTools(
        getCtx,
        () => useSettingsStore.getState().settings,
        (proposalId) =>
          updateItem(reply.id, (i) => ({ ...i, proposalIds: [...i.proposalIds, proposalId] })),
      ),
      stopWhen: stepCountIs(MAX_STEPS),
      abortSignal: abort.signal,
    });

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          updateItem(reply.id, (i) => ({ ...i, text: i.text + part.text }));
          break;
        case 'tool-call':
          updateItem(reply.id, (i) => ({
            ...i,
            tools: [...i.tools, { name: part.toolName, status: 'running' }],
          }));
          break;
        case 'tool-result':
        case 'tool-error': {
          const status = part.type === 'tool-result' ? 'done' : 'error';
          updateItem(reply.id, (i) => {
            const idx = i.tools.findIndex(
              (t) => t.name === part.toolName && t.status === 'running',
            );
            const tools = [...i.tools];
            if (idx >= 0) tools[idx] = { ...tools[idx], status };
            return { ...i, tools };
          });
          break;
        }
        case 'error':
          throw part.error;
      }
    }
    const response = await result.response;
    useAiStore.setState({ history: [...history, ...response.messages] });
  } catch (e) {
    if (abort.signal.aborted) {
      updateItem(reply.id, (i) => ({ ...i, error: '中断しました' }));
    } else {
      console.error(e);
      updateItem(reply.id, (i) => ({ ...i, error: errorMessage(e) }));
    }
    // 失敗したやり取りは history に追加しない(次の送信で会話の整合が崩れないようにする)
  } finally {
    useAiStore.setState({ busy: false, abort: null });
  }
}

export function stopGenerating() {
  useAiStore.getState().abort?.abort();
}
