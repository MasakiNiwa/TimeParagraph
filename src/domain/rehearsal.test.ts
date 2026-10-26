import { describe, expect, it } from 'vitest';
import { calibrateSpeed, type Lap } from './rehearsal';

const lap = (actualSec: number, weightedUnits: number, pauseSec = 1): Lap => ({
  blockId: 'x',
  excerpt: '',
  actualSec,
  estimatedSec: 0,
  pauseSec,
  weightedUnits,
});

describe('calibrateSpeed', () => {
  it('間を除いた実測時間から話速を求める', () => {
    // 300 字を 61 秒(うち間 1 秒)→ 300 字/分
    expect(calibrateSpeed([lap(61, 300)])).toBe(300);
    // 2 段落で合計 330 字を 60 秒 → 330 字/分
    expect(calibrateSpeed([lap(31, 165), lap(31, 165)])).toBe(330);
  });

  it('計測が短すぎるときは null', () => {
    expect(calibrateSpeed([lap(3, 10)])).toBeNull();
    expect(calibrateSpeed([])).toBeNull();
  });
});
