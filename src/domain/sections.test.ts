import { describe, expect, it } from 'vitest';
import { createBlock, type Block } from './document';
import { canMoveSection, moveSectionBy, moveSectionTo, sectionBlockIds } from './sections';

/** テキストから簡単にブロック列を作る。'#' で始まると見出し */
const make = (...texts: string[]): Block[] =>
  texts.map((t) =>
    t.startsWith('#')
      ? createBlock({ kind: 'heading', text: t.slice(1) })
      : createBlock({ text: t }),
  );
const texts = (bs: Block[]) => bs.map((b) => (b.kind === 'heading' ? `#${b.text}` : b.text));
const id = (bs: Block[], text: string) => bs.find((b) => b.text === text)!.id;

describe('sections', () => {
  const blocks = make('前置き', '#A', 'a1', 'a2', '#B', 'b1', '#C', 'c1');

  it('セクションの範囲を返す', () => {
    expect(sectionBlockIds(blocks, id(blocks, 'A'))).toEqual(
      ['A', 'a1', 'a2'].map((t) => id(blocks, t)),
    );
  });

  it('見出しを下へドラッグすると、配下の段落ごとドロップ先のセクションの後ろへ移る', () => {
    expect(texts(moveSectionTo(blocks, id(blocks, 'A'), id(blocks, 'b1')))).toEqual([
      '前置き',
      '#B',
      'b1',
      '#A',
      'a1',
      'a2',
      '#C',
      'c1',
    ]);
  });

  it('見出しを上へドラッグすると、ドロップ先のセクションの前へ移る', () => {
    expect(texts(moveSectionTo(blocks, id(blocks, 'C'), id(blocks, 'a2')))).toEqual([
      '前置き',
      '#C',
      'c1',
      '#A',
      'a1',
      'a2',
      '#B',
      'b1',
    ]);
  });

  it('見出しより前の段落の中には入れない(段落の所属が変わらない)', () => {
    expect(texts(moveSectionTo(blocks, id(blocks, 'B'), id(blocks, '前置き')))).toEqual([
      '前置き',
      '#B',
      'b1',
      '#A',
      'a1',
      'a2',
      '#C',
      'c1',
    ]);
  });

  it('自分のセクション内へのドロップでは動かない', () => {
    expect(moveSectionTo(blocks, id(blocks, 'A'), id(blocks, 'a2'))).toBe(blocks);
  });

  it('隣のセクションと入れ替える', () => {
    expect(texts(moveSectionBy(blocks, id(blocks, 'B'), -1))).toEqual([
      '前置き',
      '#B',
      'b1',
      '#A',
      'a1',
      'a2',
      '#C',
      'c1',
    ]);
    expect(texts(moveSectionBy(blocks, id(blocks, 'B'), 1))).toEqual([
      '前置き',
      '#A',
      'a1',
      'a2',
      '#C',
      'c1',
      '#B',
      'b1',
    ]);
    expect(canMoveSection(blocks, id(blocks, 'A'), -1)).toBe(false);
    expect(canMoveSection(blocks, id(blocks, 'C'), 1)).toBe(false);
    expect(moveSectionBy(blocks, id(blocks, 'A'), -1)).toBe(blocks);
  });
});
