import { beforeEach, expect, it, vi } from 'vitest';
import {
  elapsedTotalSec,
  nextParagraph,
  previousParagraph,
  resetRehearsal,
  startRehearsal,
  useRehearsalStore,
} from './rehearsalStore';

const item = (id: string) => ({
  blockId: id,
  excerpt: id,
  estimatedSec: 10,
  pauseSec: 0,
  weightedUnits: 10,
});

beforeEach(() => {
  resetRehearsal();
  vi.useFakeTimers({ toFake: ['performance'] });
});

it('前の段落へ戻ると、その段落の続きとして計測し、合計の経過は変わらない', () => {
  startRehearsal([item('a'), item('b'), item('c')], {
    docId: 'd',
    docTitle: '',
    method: 'chars',
    unitsPerMinute: 300,
  });
  vi.advanceTimersByTime(4000);
  nextParagraph();
  vi.advanceTimersByTime(2000);
  const before = elapsedTotalSec(useRehearsalStore.getState());
  previousParagraph();
  const s = useRehearsalStore.getState();
  expect(s.index).toBe(0);
  expect(s.laps).toEqual([]);
  expect(elapsedTotalSec(s)).toBeCloseTo(before, 3);
  vi.advanceTimersByTime(1000);
  nextParagraph();
  expect(useRehearsalStore.getState().laps[0]).toBeCloseTo(7, 3);
  // 最初の段落ではそれ以上戻らない
  previousParagraph();
  previousParagraph();
  expect(useRehearsalStore.getState().index).toBe(0);
  vi.useRealTimers();
});
