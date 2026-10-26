import { describe, expect, it } from 'vitest';
import { createBlock, textToBlocks } from './document';
import { countSpokenChars, estimateDocument, summarizeSections } from './estimate';
import { formatDuration, formatDurationJa } from './format';

const opts = { unitsPerMinute: 300, paragraphPauseSec: 1 };

describe('countSpokenChars', () => {
  it('空白と括弧を除いて数える', () => {
    expect(countSpokenChars('こんにちは、 世界。')).toBe(9);
    expect(countSpokenChars('「はい」')).toBe(2);
    expect(countSpokenChars('')).toBe(0);
  });
});

describe('estimateDocument', () => {
  it('文字数と話速からパラグラフごとの時間と開始時刻を計算する', () => {
    const blocks = [
      createBlock({ kind: 'heading', text: '導入' }),
      createBlock({ text: 'あ'.repeat(300) }),
      createBlock({ text: 'い'.repeat(150), speedFactor: 0.5 }),
    ];
    const est = estimateDocument({ blocks }, opts);
    expect(est.paragraphCount).toBe(2);
    expect(est.blocks[0].speakSec).toBe(0);
    expect(est.blocks[1].speakSec).toBeCloseTo(60);
    expect(est.blocks[1].pauseSec).toBe(1);
    expect(est.blocks[2].startSec).toBeCloseTo(61);
    expect(est.blocks[2].speakSec).toBeCloseTo(60);
    expect(est.blocks[2].pauseSec).toBe(0);
    expect(est.totalSec).toBeCloseTo(121);
    expect(est.totalUnits).toBe(450);
  });

  it('空のパラグラフは数えない', () => {
    const est = estimateDocument({ blocks: [createBlock(), createBlock({ text: '  ' })] }, opts);
    expect(est.totalSec).toBe(0);
    expect(est.paragraphCount).toBe(0);
  });

  it('個別の間の指定を優先する', () => {
    const blocks = [createBlock({ text: 'あ', pauseAfterSec: 5 }), createBlock({ text: 'い' })];
    expect(estimateDocument({ blocks }, opts).blocks[0].pauseSec).toBe(5);
  });
});

describe('textToBlocks', () => {
  it('空行で分割し、# 行を見出しにする', () => {
    const blocks = textToBlocks('# はじめに\n一段落目\n続き\n\n二段落目\n\n\n## まとめ\n最後');
    expect(blocks.map((b) => [b.kind, b.text])).toEqual([
      ['heading', 'はじめに'],
      ['paragraph', '一段落目\n続き'],
      ['paragraph', '二段落目'],
      ['heading', 'まとめ'],
      ['paragraph', '最後'],
    ]);
  });
});

describe('format', () => {
  it('時間を整形する', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDurationJa(125)).toBe('2分5秒');
    expect(formatDurationJa(9)).toBe('9秒');
  });
});

describe('summarizeSections', () => {
  it('見出しごとに時間を集計する', () => {
    const blocks = [
      createBlock({ text: 'あ'.repeat(300) }),
      createBlock({ kind: 'heading', text: '本題' }),
      createBlock({ text: 'い'.repeat(300) }),
    ];
    const est = estimateDocument({ blocks }, opts);
    const sections = summarizeSections({ blocks }, est);
    expect(sections).toHaveLength(2);
    expect(sections[0].headingId).toBeNull();
    expect(sections[0].totalSec).toBeCloseTo(61);
    expect(sections[1].title).toBe('本題');
    expect(sections[1].startSec).toBeCloseTo(61);
    expect(sections[1].totalSec).toBeCloseTo(60);
  });
});
