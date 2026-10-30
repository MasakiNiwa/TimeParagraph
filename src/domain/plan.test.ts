import { describe, expect, it } from 'vitest';
import { createBlock } from './document';
import { estimateDocument } from './estimate';
import { distribute, planRows, planStatus } from './plan';

const opts = { unitsPerMinute: 300, paragraphPauseSec: 0 };

describe('plan', () => {
  it('見出しがあればセクション単位、見出し前の段落は段落単位で行を作る', () => {
    const blocks = [
      createBlock({ text: 'あ'.repeat(50), targetSec: 20 }),
      createBlock({ kind: 'heading', text: '本題', targetSec: 60 }),
      createBlock({ text: 'い'.repeat(100), role: 'example' }),
      createBlock({ text: 'う'.repeat(50), role: 'transition' }),
      createBlock({ kind: 'heading', text: '' }),
    ];
    const rows = planRows(blocks, estimateDocument({ blocks }, opts));
    expect(
      rows.map((r) => [r.kind, r.label, Math.round(r.actualSec), r.targetSec, r.weight]),
    ).toEqual([
      ['paragraph', `段落1: ${'あ'.repeat(14)}…`, 10, 20, 1],
      ['section', '本題', 30, 60, 1.8],
      ['section', '(無題の見出し)', 0, null, 1],
    ]);
  });

  it('均等・今の比率・タイプの目安で割り振り、合計を目標に合わせる', () => {
    const rows = [
      { id: 'a', kind: 'section' as const, label: 'a', actualSec: 10, targetSec: null, weight: 1 },
      { id: 'b', kind: 'section' as const, label: 'b', actualSec: 30, targetSec: null, weight: 2 },
      { id: 'c', kind: 'section' as const, label: 'c', actualSec: 0, targetSec: null, weight: 1 },
    ];
    expect(distribute(300, rows, 'even')).toEqual([100, 100, 100]);
    expect(distribute(300, rows, 'current')).toEqual([75, 225, 0]);
    expect(distribute(300, rows, 'role')).toEqual([75, 150, 75]);
    const odd = distribute(100, rows, 'even');
    expect(odd.reduce((a, b) => a + b, 0)).toBe(100);
    // まだ何も書いていないときの「今の比率」は均等
    expect(
      distribute(
        90,
        rows.map((r) => ({ ...r, actualSec: 0 })),
        'current',
      ),
    ).toEqual([30, 30, 30]);
  });

  it('計画との差は 10% か 5 秒まで許容する', () => {
    expect(planStatus(64, 60)).toBe('ok');
    expect(planStatus(67, 60)).toBe('over');
    expect(planStatus(50, 60)).toBe('under');
    expect(planStatus(320, 300)).toBe('ok');
    expect(planStatus(340, 300)).toBe('over');
  });
});
