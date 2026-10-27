import { smoothStream, stepCountIs, streamText, type StopCondition, type ToolSet } from 'ai';
import type { AnalysisContext } from '@/features/analysis/types';
import { newId } from '@/domain/document';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useApiKeyStore } from './apiKeys';
import { buildAppState } from './appState';
import { updateItem, useAiStore, type ChatItem } from './aiStore';
import { buildSystemPrompt } from './prompt';
import { aiProviders } from './providers';
import { createAiTools } from './tools';

const MAX_STEPS = 8;
/** 応答が始まるまで / 応答の途中で、これ以上なにも届かなければ打ち切る */
const STALL_MS = 120_000;

function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/401|403|API key|api_key|invalid.*key/i.test(msg))
    return `API キーが正しくないか、権限がありません。設定を確認してください。(${msg})`;
  if (/429|quota|rate/i.test(msg))
    return `利用上限(無料枠など)に達しました。しばらく待ってから再度お試しください。(${msg})`;
  if (/404|not found|model/i.test(msg))
    return `モデルが見つかりません。モデルを選び直してください。(${msg})`;
  if (/timeout|timed out|time out/i.test(msg))
    return `AI から ${STALL_MS / 1000} 秒以上応答がなかったため、打ち切りました。「考える深さ」を「速さ優先」にするか、軽いモデル(flash-lite など)をお試しください。`;
  if (/failed to fetch|networkerror|network error|load failed/i.test(msg))
    return `通信が途中で切れました。電波の状態を確認して、もう一度お試しください。応答に時間がかかる場合は「考える深さ」を「速さ優先」にするか、軽いモデル(flash-lite など)をお試しください。(${msg})`;
  return msg;
}

/** 思考過程のオプションに対応していないモデルが返すエラーか */
const isThinkingUnsupported = (e: unknown) =>
  /think|reasoning|budget|adaptive/i.test(e instanceof Error ? e.message : String(e));

/** 編集案の作成に成功したら、それ以上モデルを呼ばずに終える(余計な往復で待たせない) */
const proposalCreated: StopCondition<ToolSet> = ({ steps }) =>
  steps
    .at(-1)
    ?.toolResults.some(
      (r) =>
        r.toolName === 'propose_edits' && (r.output as { ok?: boolean } | undefined)?.ok === true,
    ) ?? false;

function toolFailure(output: unknown): string | undefined {
  if (output && typeof output === 'object' && 'ok' in output && output.ok === false) {
    const errors = (output as { errors?: string[] }).errors;
    return errors?.join(' / ') ?? '失敗しました';
  }
  return undefined;
}

/** ユーザーの発言を送り、ストリーミングで応答を受け取る */
export async function sendMessage(text: string, getCtx: () => AnalysisContext | null) {
  const settings = useSettingsStore.getState().settings;
  const provider = aiProviders[settings.ai.provider];
  const apiKey = useApiKeyStore.getState().keys[provider.id];
  const ctx = getCtx();
  if (!apiKey || !ctx || useAiStore.getState().busy) return;

  const now = Date.now();
  const base = { tools: [], proposalIds: [], reasoning: '', steps: [], startedAt: now };
  const userItem: ChatItem = { ...base, id: newId(), role: 'user', text, phase: 'done' };
  const reply: ChatItem = { ...base, id: newId(), role: 'assistant', text: '', phase: 'waiting' };
  const abort = new AbortController();
  const history = [...useAiStore.getState().history, { role: 'user' as const, content: text }];
  useAiStore.setState((s) => ({ items: [...s.items, userItem, reply], busy: true, abort }));
  const set = (fn: (i: ChatItem) => ChatItem) => updateItem(reply.id, fn);
  /** 実行中のステップの所要時間を記録する */
  const mark = (
    kind: 'chunk' | 'output' | 'reasoning' | 'end',
    extra?: { chars?: number; tool?: string },
  ) =>
    set((i) => {
      const steps = [...i.steps];
      const cur = steps.at(-1);
      if (!cur || cur.endedAt) return i;
      const t = Date.now();
      const next = { ...cur, firstChunkAt: cur.firstChunkAt ?? t };
      if (kind === 'output') next.firstOutputAt ??= t;
      if (kind === 'reasoning') next.reasoningChars += extra?.chars ?? 0;
      if (kind === 'end') next.endedAt = t;
      if (extra?.tool) next.tools = [...next.tools, extra.tool];
      steps[steps.length - 1] = next;
      return { ...i, steps };
    });

  const run = async (withThinking: boolean) => {
    let received = false;
    const result = streamText({
      model: provider.createModel(apiKey, settings.ai[provider.modelSetting]),
      system: buildSystemPrompt(buildAppState(ctx, settings)),
      messages: history,
      tools: createAiTools(
        getCtx,
        () => useSettingsStore.getState().settings,
        (proposalId) => set((i) => ({ ...i, proposalIds: [...i.proposalIds, proposalId] })),
      ),
      // 考える深さ。思考オプション非対応のモデルで失敗したときは、プロバイダーの既定に戻して再試行する
      reasoning: withThinking ? settings.ai.effort : 'provider-default',
      providerOptions:
        withThinking && settings.ai.showThinking ? provider.thinkingOptions : undefined,
      stopWhen: [stepCountIs(MAX_STEPS), proposalCreated],
      timeout: { firstChunkMs: STALL_MS, chunkMs: STALL_MS },
      // まとまって届いた本文も、少しずつ表示して書いている様子が見えるようにする
      experimental_transform: smoothStream({
        delayInMs: 8,
        chunking: new Intl.Segmenter('ja', { granularity: 'word' }),
      }),
      maxRetries: 1,
      abortSignal: abort.signal,
    });

    try {
      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'start-step':
            // リクエストを送った時刻から測る(前のステップの終わり、最初は送信時刻)
            set((i) => ({
              ...i,
              steps: [
                ...i.steps,
                {
                  startedAt: i.steps.at(-1)?.endedAt ?? i.startedAt,
                  reasoningChars: 0,
                  tools: [],
                },
              ],
            }));
            break;
          case 'finish-step':
            mark('end');
            break;
          case 'reasoning-delta':
            received = true;
            mark('reasoning', { chars: part.text.length });
            set((i) => ({ ...i, phase: 'thinking', reasoning: i.reasoning + part.text }));
            break;
          case 'text-delta':
            received = true;
            mark('output');
            set((i) => ({ ...i, phase: 'answering', text: i.text + part.text }));
            break;
          case 'tool-call':
            received = true;
            mark('output', { tool: part.toolName });
            set((i) => ({
              ...i,
              phase: 'tool',
              tools: [...i.tools, { name: part.toolName, status: 'running' }],
            }));
            break;
          case 'tool-result':
          case 'tool-error': {
            const message =
              part.type === 'tool-error' ? errorMessage(part.error) : toolFailure(part.output);
            set((i) => {
              const idx = i.tools.findIndex(
                (t) => t.name === part.toolName && t.status === 'running',
              );
              const tools = [...i.tools];
              if (idx >= 0)
                tools[idx] = { ...tools[idx], status: message ? 'error' : 'done', message };
              // ツールの結果を受けて、モデルが続きを考える
              return { ...i, tools, phase: 'waiting' };
            });
            break;
          }
          case 'error':
            throw part.error;
        }
      }
      const response = await result.response;
      useAiStore.setState({ history: [...history, ...response.messages] });
      // 編集案を作って終えた場合は、アプリから一言添える
      set((i) =>
        !i.text.trim() && i.proposalIds.length > 0
          ? {
              ...i,
              text: '編集案を作成しました。内容と時間の変化を確認して、よければ「適用する」を押してください。',
            }
          : i,
      );
    } catch (e) {
      // 思考過程の表示に対応していないモデルなら、オプションなしでやり直す
      if (withThinking && !received && !abort.signal.aborted && isThinkingUnsupported(e)) {
        console.warn('思考過程なしで再試行します', e);
        return run(false);
      }
      throw e;
    }
  };

  try {
    await run(true);
  } catch (e) {
    if (abort.signal.aborted) {
      set((i) => ({ ...i, error: '中断しました' }));
    } else {
      console.error(e);
      set((i) => ({ ...i, error: errorMessage(e) }));
    }
    // 失敗したやり取りは history に追加しない(次の送信で会話の整合が崩れないようにする)
  } finally {
    set((i) => ({ ...i, phase: 'done', finishedAt: Date.now() }));
    useAiStore.setState({ busy: false, abort: null });
  }
}

export function stopGenerating() {
  useAiStore.getState().abort?.abort();
}
