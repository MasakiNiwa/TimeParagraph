import { describe, expect, it } from 'vitest';
import { countKanaMora, countMoraFromTokens, estimateMoraHeuristic } from './mora';

describe('countKanaMora', () => {
  it('拗音は 1 拍、促音・長音・撥音は 1 拍として数える', () => {
    expect(countKanaMora('キョウ')).toBe(2);
    expect(countKanaMora('ガッコウ')).toBe(4);
    expect(countKanaMora('コーヒー')).toBe(4);
    expect(countKanaMora('シンブン')).toBe(4);
    expect(countKanaMora('ティー')).toBe(2);
  });

  it('句読点を間として数える', () => {
    expect(countKanaMora('ハイ、ソウデス。')).toBe(2 + 1 + 4 + 2);
  });
});

describe('estimateMoraHeuristic', () => {
  it('かなはそのまま、漢字は平均値で換算する', () => {
    expect(estimateMoraHeuristic('きょう')).toBe(2);
    expect(estimateMoraHeuristic('会議')).toBe(3.6);
    expect(estimateMoraHeuristic('ok')).toBe(1.4);
  });
});

describe('countMoraFromTokens', () => {
  it('発音を優先し、読みのない語は簡易推定する', () => {
    const n = countMoraFromTokens([
      { surface: '今日', pos: '名詞', pronunciation: 'キョー', reading: 'キョウ' },
      { surface: 'は', pos: '助詞', pronunciation: 'ワ', reading: 'ハ' },
      { surface: '、', pos: '記号', pronunciation: '、', reading: '、' },
      { surface: 'AI', pos: '名詞' },
    ]);
    expect(n).toBe(2 + 1 + 1 + 1.4);
  });
});
