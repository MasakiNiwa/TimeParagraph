import { beforeEach, describe, expect, it } from 'vitest';
import { buildTimeTree, paragraphStats } from '@/domain/analysis';
import { createBlock, createDocument } from '@/domain/document';
import { charEstimator, estimateDocument, summarizeSections } from '@/domain/estimate';
import type { AnalysisContext } from '@/features/analysis/types';
import { defaultSettings } from '@/features/settings/settingsSchema';
import { useAiStore } from './aiStore';
import { buildAppState } from './appState';
import { createAiTools } from './tools';

const opts = { unitsPerMinute: 300, paragraphPauseSec: 1 };

function makeCtx(): AnalysisContext {
  const doc = createDocument({
    blocks: [createBlock({ text: 'あ'.repeat(300) }), createBlock({ text: 'い'.repeat(150) })],
    targetDurationSec: 60,
  });
  const estimate = estimateDocument(doc, opts);
  const sections = summarizeSections(doc, estimate);
  return {
    doc,
    estimate,
    sections,
    tree: buildTimeTree(doc, estimate, sections, opts, charEstimator),
    stats: paragraphStats(doc, estimate),
    estimator: charEstimator,
    unitsPerMinute: 300,
    rehearsals: [],
    openInEditor: () => {},
  };
}

// ツールの execute を直接呼ぶ(AI SDK の実行時オプションはテストでは不要)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (t: any, input: unknown) => t.execute(input, { toolCallId: 't', messages: [] });

describe('AI tools', () => {
  let ctx: AnalysisContext;
  const proposals: string[] = [];
  let tools: ReturnType<typeof createAiTools>;

  beforeEach(() => {
    ctx = makeCtx();
    proposals.length = 0;
    useAiStore.setState({ proposals: {} });
    tools = createAiTools(
      () => ctx,
      () => defaultSettings,
      (id) => proposals.push(id),
    );
  });

  it('アプリの状態に推定値と目標との差が含まれる', () => {
    const state = buildAppState(ctx, defaultSettings);
    expect(state.document.totalEstimatedSec).toBeCloseTo(91);
    expect(state.document.diffFromTargetSec).toBeCloseTo(31);
    expect(state.blocks.map((b) => b.ref)).toEqual(['B1', 'B2']);
  });

  it('estimate_text はアプリの推定方式で秒数を返す', async () => {
    const [r] = await run(tools.estimate_text, { texts: ['あ'.repeat(150)] });
    expect(r).toEqual({ units: 150, unit: '字', seconds: 30 });
  });

  it('propose_edits は原稿を変えずに提案と前後の時間を返す', async () => {
    const r = await run(tools.propose_edits, {
      summary: '短縮',
      edits: [
        { op: 'replace', ref: 'B1', text: 'あ'.repeat(150), kind: 'paragraph', reason: '' },
        { op: 'insert_after', ref: 'START', text: '見出し', kind: 'heading', reason: '' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.beforeSec).toBeCloseTo(91);
    expect(r.afterSec).toBeCloseTo(61);
    expect(proposals).toEqual([r.proposalId]);
    expect(useAiStore.getState().proposals[r.proposalId].status).toBe('pending');
    expect(ctx.doc.blocks[0].text).toBe('あ'.repeat(300));
    // ref はアプリ側でブロックの id に変換される
    const edits = useAiStore.getState().proposals[r.proposalId].edits;
    expect(edits[0].blockId).toBe(ctx.doc.blocks[0].id);
    expect(edits[1].blockId).toBeNull();
  });

  it('propose_edits は存在しない ref を拒否する', async () => {
    const r = await run(tools.propose_edits, {
      summary: 'x',
      edits: [{ op: 'delete', ref: 'B9', text: '', kind: 'paragraph', reason: '' }],
    });
    expect(r.errors[0]).toContain('B9');
    expect(r.ok).toBe(false);
    expect(proposals).toEqual([]);
  });
});
