import { describe, expect, it } from 'vitest';
import { findLongSentences, buildTimeTree, findPath, paragraphStats } from './analysis';
import { createBlock } from './document';
import { charEstimator, estimateDocument, summarizeSections } from './estimate';

const opts = { unitsPerMinute: 300, paragraphPauseSec: 0 };

function setup(blocks: ReturnType<typeof createBlock>[]) {
  const doc = { title: 'テスト', blocks };
  const est = estimateDocument(doc, opts);
  const sections = summarizeSections(doc, est);
  return { doc, est, tree: buildTimeTree(doc, est, sections, opts, charEstimator) };
}

describe('buildTimeTree', () => {
  it('見出しがあればセクション → 段落 → 文の階層にする', () => {
    const { tree } = setup([
      createBlock({ kind: 'heading', text: '導入' }),
      createBlock({ text: 'あ'.repeat(149) + '。' + 'い'.repeat(149) + '。' }),
      createBlock({ kind: 'heading', text: '本題' }),
      createBlock({ text: 'う'.repeat(300) }),
    ]);
    expect(tree.sec).toBeCloseTo(120);
    expect(tree.children?.map((c) => [c.level, c.label])).toEqual([
      ['section', '導入'],
      ['section', '本題'],
    ]);
    const p = tree.children![0].children![0];
    expect(p.level).toBe('paragraph');
    expect(p.children).toHaveLength(2);
    expect(p.children![0].sec).toBeCloseTo(30);
  });

  it('見出しがなければ段落から始める', () => {
    const { tree } = setup([createBlock({ text: 'あ' }), createBlock({ text: 'い' })]);
    expect(tree.children?.map((c) => c.level)).toEqual(['paragraph', 'paragraph']);
  });

  it('パスでノードをたどる', () => {
    const { tree } = setup([createBlock({ text: 'あ。い。' })]);
    const p = tree.children![0];
    expect(findPath(tree, [p.id, p.children![1].id]).map((n) => n.level)).toEqual([
      'document',
      'paragraph',
      'sentence',
    ]);
  });
});

describe('paragraphStats', () => {
  it('中央値と比べて長い/短い段落を検出する', () => {
    const { doc, est } = setup([
      createBlock({ text: 'あ'.repeat(100) }),
      createBlock({ text: 'あ'.repeat(100) }),
      createBlock({ text: 'あ'.repeat(300) }),
      createBlock({ text: 'あ'.repeat(20) }),
    ]);
    const s = paragraphStats(doc, est);
    expect(s.count).toBe(4);
    expect(s.medianSec).toBeCloseTo(20);
    expect(s.long.map((p) => p.index)).toEqual([3]);
    expect(s.short.map((p) => p.index)).toEqual([4]);
  });
});

describe('findLongSentences', () => {
  it('しきい値を超える文を長い順に返す', () => {
    const doc = {
      blocks: [createBlock({ text: 'あ'.repeat(90) + '。短い。' + 'い'.repeat(100) })],
    };
    expect(findLongSentences(doc, charEstimator).map((s) => s.units)).toEqual([100, 91]);
  });
});
