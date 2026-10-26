import { describe, expect, it } from 'vitest';
import { splitSentences } from './sentences';

describe('splitSentences', () => {
  it('句点・感嘆符・改行で分割する', () => {
    expect(splitSentences('こんにちは。今日は晴れ!\n次の行です')).toEqual([
      'こんにちは。',
      '今日は晴れ!',
      '次の行です',
    ]);
  });

  it('閉じかっこは前の文に含める', () => {
    expect(splitSentences('彼は「行く。」と言った。')).toEqual(['彼は「行く。」', 'と言った。']);
  });

  it('空文字は空配列', () => {
    expect(splitSentences('  ')).toEqual([]);
  });
});
