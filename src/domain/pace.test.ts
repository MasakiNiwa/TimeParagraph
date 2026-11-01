import { describe, expect, it } from 'vitest';
import { createBlock } from './document';
import { estimateDocument } from './estimate';
import { paceDrift, paceSchedule, paceText } from './pace';

const opts = { unitsPerMinute: 60, paragraphPauseSec: 0 };
const p = (n: number, extra = {}) => createBlock({ text: 'あ'.repeat(n), ...extra });

describe('paceSchedule', () => {
  it('計画がなければ推定、目標時間があれば目標に合わせて伸縮する', () => {
    const blocks = [p(10), p(30)];
    const est = estimateDocument({ blocks }, opts);
    const a = paceSchedule(blocks, est, null);
    expect(a.basis).toBe('estimate');
    expect([...a.byId.values()]).toEqual([10, 30]);
    const b = paceSchedule(blocks, est, 20);
    expect(b.basis).toBe('target');
    expect([...b.byId.values()]).toEqual([5, 15]);
  });

  it('段落の計画を優先し、セクションの計画の残りを推定の比で配分する', () => {
    const blocks = [
      p(10),
      createBlock({ kind: 'heading', text: 'A', targetSec: 60 }),
      p(10, { targetSec: 20 }),
      p(10),
      p(30),
      createBlock({ kind: 'heading', text: 'B' }),
      p(5, { targetSec: 8 }),
      p(7),
    ];
    const s = paceSchedule(blocks, estimateDocument({ blocks }, opts), 999);
    expect(s.basis).toBe('plan');
    expect([...s.byId.values()]).toEqual([10, 20, 10, 30, 8, 7]);
    expect(s.totalSec).toBe(85);
  });
});

it('予定との差は、現在の段落の予定を超えた分だけ遅れにする', () => {
  expect(paceDrift([10, 20], 1, 5, 15)).toBe(0);
  expect(paceDrift([10, 20], 1, 25, 35)).toBe(5);
  expect(paceDrift([10, 20], 1, 5, 12)).toBe(-3);
});

it('ペースの表示', () => {
  expect(paceText(0.4, 'plan')).toBe('計画どおり');
  expect(paceText(12, 'plan')).toBe('+0:12 計画より遅れ');
  expect(paceText(-65, 'target')).toBe('−1:05 目標ペースより先行');
});
