import { describe, expect, it } from 'vitest';
import { createBlock } from './document';
import { applyEdits, validateEdits } from './edits';

const blocks = [createBlock({ text: 'A' }), createBlock({ text: 'B' }), createBlock({ text: 'C' })];
const [a, b, c] = blocks.map((x) => x.id);

describe('applyEdits', () => {
  it('置き換え・削除・挿入を順に適用する', () => {
    const out = applyEdits(blocks, [
      { op: 'replace', blockId: a, text: 'A2' },
      { op: 'delete', blockId: b },
      { op: 'insert_after', blockId: c, text: 'D' },
      { op: 'insert_after', blockId: null, text: '見出し', kind: 'heading' },
    ]);
    expect(out.map((x) => [x.kind, x.text])).toEqual([
      ['heading', '見出し'],
      ['paragraph', 'A2'],
      ['paragraph', 'C'],
      ['paragraph', 'D'],
    ]);
    expect(blocks.map((x) => x.text)).toEqual(['A', 'B', 'C']);
  });
});

describe('validateEdits', () => {
  it('存在しない id や空のテキストを検出する', () => {
    expect(validateEdits(blocks, [{ op: 'replace', blockId: a, text: 'x' }]).ok).toBe(true);
    const v = validateEdits(blocks, [
      { op: 'replace', blockId: 'nope', text: 'x' },
      { op: 'insert_after', blockId: b, text: ' ' },
      { op: 'delete', blockId: null },
    ]);
    expect(v.errors).toHaveLength(3);
  });
});

it('同じ位置への複数追加は指定順を保つ', () => {
  const original = [createBlock({ text: '元' })];
  const edits = ['1', '2', '3'].map((text) => ({
    op: 'insert_after' as const,
    blockId: original[0].id,
    text,
  }));
  expect(applyEdits(original, edits).map((b) => b.text)).toEqual(['元', '1', '2', '3']);
});
it('削除済みの段落を後続操作で参照した提案を拒否する', () => {
  const original = [createBlock({ text: '元' })];
  expect(
    validateEdits(original, [
      { op: 'delete', blockId: original[0].id },
      { op: 'replace', blockId: original[0].id, text: '更新' },
    ]).ok,
  ).toBe(false);
});
