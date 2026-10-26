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
