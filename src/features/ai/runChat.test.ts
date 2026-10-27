import { beforeEach, expect, it, vi } from 'vitest';
import type { AnalysisContext } from '@/features/analysis/types';
import { createBlock, createDocument } from '@/domain/document';
import { useDocumentStore } from '@/features/editor/documentStore';
import { useAiStore, resetChat } from './aiStore';
import { useApiKeyStore } from './apiKeys';
import { sendMessage } from './runChat';

const mocks = vi.hoisted(() => ({
  stream: vi.fn(),
  tools: vi.fn((getCtx: () => unknown) => {
    void getCtx;
    return {};
  }),
}));
vi.mock('ai', () => ({ streamText: mocks.stream, stepCountIs: () => () => false }));
vi.mock('./appState', () => ({ buildAppState: () => ({}) }));
vi.mock('./prompt', () => ({ buildSystemPrompt: () => 'instructions' }));
vi.mock('./tools', () => ({ createAiTools: mocks.tools }));
vi.mock('./providers', () => ({
  aiProviders: {
    google: { id: 'google', modelSetting: 'googleModel', createModel: () => ({}) },
  },
}));

function deferredStream(text: string) {
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return {
    finish,
    result: {
      fullStream: (async function* () {
        await gate;
        yield { type: 'text-delta', text };
      })(),
      response: Promise.resolve({ messages: [{ role: 'assistant', content: text }] }),
    },
  };
}
let ctx: AnalysisContext;
beforeEach(() => {
  resetChat();
  mocks.stream.mockReset();
  mocks.tools.mockClear();
  useApiKeyStore.getState().setKey('google', 'test-key');
  const doc = createDocument({ blocks: [createBlock({ text: '原稿' })] });
  useDocumentStore.getState().load(doc);
  ctx = { doc } as AnalysisContext;
});
it('会話リセット後に旧リクエストが終了しても、新しい応答の実行状態や履歴を壊さない', async () => {
  const old = deferredStream('古い返答');
  const current = deferredStream('新しい返答');
  mocks.stream.mockReturnValueOnce(old.result).mockReturnValueOnce(current.result);
  const first = sendMessage('最初', () => ctx);
  resetChat();
  const second = sendMessage('次', () => ctx);
  const controller = useAiStore.getState().abort;
  old.finish();
  await first;
  expect(useAiStore.getState().abort).toBe(controller);
  expect(useAiStore.getState().busy).toBe(true);
  expect(useAiStore.getState().history).toEqual([]);
  current.finish();
  await second;
  expect(useAiStore.getState().busy).toBe(false);
  expect(JSON.stringify(useAiStore.getState().history)).toContain('新しい返答');
  expect(JSON.stringify(useAiStore.getState())).not.toContain('古い返答');
});
it('送信後に本文が変わったら、古い B1 等を使うツール操作を拒否する', async () => {
  const request = deferredStream('返答');
  mocks.stream.mockReturnValueOnce(request.result);
  const running = sendMessage('変更案を作って', () => ctx);
  const getCtx = mocks.tools.mock.calls[0][0] as () => AnalysisContext | null;
  expect(getCtx()).toBe(ctx);
  useDocumentStore.getState().updateBlock(ctx.doc.blocks[0].id, { text: '手で修正' });
  expect(getCtx()).toBeNull();
  request.finish();
  await running;
});
