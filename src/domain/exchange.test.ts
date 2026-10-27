import { describe, expect, it } from 'vitest';
import { createBlock, createDocument } from './document';
import { estimateDocument } from './estimate';
import { exportJson, exportMarkdown, exportTimedText, importDocument } from './exchange';

const doc = createDocument({
  title: '発表',
  targetDurationSec: 120,
  blocks: [
    createBlock({ kind: 'heading', text: '導入' }),
    createBlock({ text: 'あ'.repeat(300), note: 'ゆっくり' }),
    createBlock({ text: 'いいい', speedFactor: 1.2 }),
  ],
});

describe('exchange', () => {
  it('JSON で書き出して取り込むと内容が保たれ、id は新しくなる', () => {
    const r = importDocument(exportJson(doc), 'x.json');
    if (!r.ok) throw new Error(r.error);
    expect(r.doc.id).not.toBe(doc.id);
    expect(r.doc.title).toBe('発表');
    expect(r.doc.targetDurationSec).toBe(120);
    expect(r.doc.blocks.map((b) => [b.kind, b.text, b.speedFactor, b.note])).toEqual(
      doc.blocks.map((b) => [b.kind, b.text, b.speedFactor, b.note]),
    );
    expect(r.doc.blocks[0].id).not.toBe(doc.blocks[0].id);
  });

  it('Markdown で書き出して取り込むと見出し・段落・メモが戻る', () => {
    const md = exportMarkdown(doc);
    expect(md).toContain('## 導入');
    expect(md).toContain('> ゆっくり');
    const r = importDocument(md, 'a.md');
    if (!r.ok) throw new Error(r.error);
    expect(r.doc.title).toBe('発表');
    expect(r.doc.blocks.map((b) => [b.kind, b.text, b.note])).toEqual([
      ['heading', '導入', ''],
      ['paragraph', 'あ'.repeat(300), 'ゆっくり'],
      ['paragraph', 'いいい', ''],
    ]);
  });

  it('時間つきテキストに開始時刻と合計を含める', () => {
    const est = estimateDocument(doc, { unitsPerMinute: 300, paragraphPauseSec: 1 });
    const t = exportTimedText(doc, est);
    expect(t).toContain('合計 1:02 / 目標 2:00');
    expect(t).toContain('[2] 1:01〜');
  });

  it('壊れた JSON や空のテキストはエラーにする', () => {
    expect(importDocument('{broken', 'a.json').ok).toBe(false);
    expect(importDocument('{"a":1}', 'a.json').ok).toBe(false);
    expect(importDocument('   ', 'a.txt').ok).toBe(false);
  });
});

it('波括弧で始まるテキスト原稿と大文字の JSON 拡張子を扱える', () => {
  const text = importDocument('{ は集合の始まりです。', '原稿.txt');
  expect(text.ok && text.doc.blocks[0].text).toBe('{ は集合の始まりです。');
  expect(importDocument(exportJson(doc), 'BACKUP.JSON').ok).toBe(true);
});
