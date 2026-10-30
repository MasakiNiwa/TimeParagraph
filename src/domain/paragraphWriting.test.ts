import { describe, expect, it } from 'vitest';
import { createBlock } from './document';
import { estimateDocument } from './estimate';
import { checkParagraphs, skimText, topicSentence } from './paragraphWriting';

const opts = { unitsPerMinute: 300, paragraphPauseSec: 0 };

describe('paragraphWriting', () => {
  it('最初の文をトピックセンテンスとする', () => {
    expect(topicSentence('結論はAです。理由は二つあります。')).toBe('結論はAです。');
    expect(topicSentence('')).toBe('');
  });

  it('段落の構造を点検する', () => {
    const blocks = [
      createBlock({ kind: 'heading', text: '本題' }),
      createBlock({ title: '要点', text: '短い要点です。説明します。' }),
      createBlock({ text: '一文だけの段落です。' }),
      createBlock({ text: `${'長'.repeat(70)}。続きです。` }),
      createBlock({ title: 't', text: 'あ。'.repeat(8) }),
      createBlock({ title: 't', text: `${'い'.repeat(500)}。説明。` }),
      createBlock({ text: '' }),
    ];
    const checks = checkParagraphs(blocks, estimateDocument({ blocks }, opts));
    expect(checks.map((c) => [c.index, c.issues])).toEqual([
      [1, []],
      [2, ['no-title', 'single-sentence']],
      [3, ['no-title', 'long-topic']],
      [4, ['too-many-sentences']],
      [5, ['long-topic', 'too-long']],
    ]);
  });

  it('縦読みでは見出しと要点(タイトル優先)を並べる', () => {
    const blocks = [
      createBlock({ kind: 'heading', text: '導入' }),
      createBlock({ text: '最初の文。次の文。' }),
      createBlock({ title: 'まとめの要点', text: '本文。' }),
    ];
    expect(skimText(blocks)).toBe('■ 導入\n・最初の文。\n・まとめの要点');
  });
});
