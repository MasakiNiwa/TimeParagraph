import type { Block } from './document';

/**
 * 見出しとその配下の段落(次の見出しの手前まで)を「セクション」として扱う。
 * ブロックはフラットな配列のまま、範囲を計算して移動する。
 */

/** 見出しの位置から、セクションの範囲 [start, end) を返す */
export function sectionRange(blocks: Block[], headingIndex: number): [number, number] {
  let end = headingIndex + 1;
  while (end < blocks.length && blocks[end].kind !== 'heading') end++;
  return [headingIndex, end];
}

/** 最初の見出しより前の段落(どのセクションにも属さない部分)の長さ */
function leadingLength(blocks: Block[]): number {
  const i = blocks.findIndex((b) => b.kind === 'heading');
  return i < 0 ? blocks.length : i;
}

/** 位置 index のブロックが属するセクションの範囲。見出しより前なら null */
function sectionOf(blocks: Block[], index: number): [number, number] | null {
  for (let i = index; i >= 0; i--) if (blocks[i].kind === 'heading') return sectionRange(blocks, i);
  return null;
}

/**
 * セクションを、ドロップ先のブロック(overId)の位置へ移動する。
 * セクションの途中には入れず、上へ動かすときはドロップ先のセクションの前、
 * 下へ動かすときは後ろに置く。見出しより前の段落の中には入れない(段落の所属が変わるため)。
 */
export function moveSectionTo(blocks: Block[], headingId: string, overId: string): Block[] {
  const from = blocks.findIndex((b) => b.id === headingId);
  const overIndex = blocks.findIndex((b) => b.id === overId);
  if (from < 0 || overIndex < 0 || blocks[from].kind !== 'heading') return blocks;
  const [start, end] = sectionRange(blocks, from);
  if (overIndex >= start && overIndex < end) return blocks;

  const moving = blocks.slice(start, end);
  const rest = [...blocks.slice(0, start), ...blocks.slice(end)];
  const overInRest = rest.findIndex((b) => b.id === overId);
  const target = sectionOf(rest, overInRest);
  const insertAt = target ? (overIndex < start ? target[0] : target[1]) : leadingLength(rest);
  return [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];
}

/** セクションを隣のセクションと入れ替える(delta: -1 で上、1 で下) */
export function moveSectionBy(blocks: Block[], headingId: string, delta: -1 | 1): Block[] {
  const headings = blocks.flatMap((b, i) => (b.kind === 'heading' ? [i] : []));
  const k = headings.findIndex((i) => blocks[i].id === headingId);
  const neighbor = headings[k + delta];
  if (k < 0 || neighbor === undefined) return blocks;
  return moveSectionTo(blocks, headingId, blocks[neighbor].id);
}

/** 見出しが上下に動けるか(セクション単位で) */
export function canMoveSection(blocks: Block[], headingId: string, delta: -1 | 1): boolean {
  const headings = blocks.filter((b) => b.kind === 'heading');
  const k = headings.findIndex((b) => b.id === headingId);
  return k >= 0 && headings[k + delta] !== undefined;
}

/** セクション(見出しと配下の段落)の id 一覧 */
export function sectionBlockIds(blocks: Block[], headingId: string): string[] {
  const i = blocks.findIndex((b) => b.id === headingId);
  if (i < 0 || blocks[i].kind !== 'heading') return [];
  const [start, end] = sectionRange(blocks, i);
  return blocks.slice(start, end).map((b) => b.id);
}
