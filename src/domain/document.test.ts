import { expect, it } from 'vitest';
import { createBlock, createDocument, parseDocument } from './document';

it('不正な一段落のために原稿全体を空へ置き換えない', () => {
  const doc = createDocument();
  expect(parseDocument({ ...doc, blocks: [doc.blocks[0], { text: 'id なし' }] })).toBeNull();
});
it('重複するブロック id と将来のスキーマを拒否する', () => {
  const doc = createDocument();
  expect(parseDocument({ ...doc, blocks: [doc.blocks[0], doc.blocks[0]] })).toBeNull();
  expect(parseDocument({ ...doc, schemaVersion: 2 })).toBeNull();
});
it('空の原稿も一段落を持ち、再度入力できる', () => {
  expect(parseDocument({ ...createDocument(), blocks: [] })?.blocks).toHaveLength(1);
  expect(createDocument({ blocks: [createBlock()] }).blocks).toHaveLength(1);
});
