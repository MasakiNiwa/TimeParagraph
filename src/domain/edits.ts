import { z } from 'zod';
import { createBlock, type Block } from './document';

/** 段落単位の編集操作。AI の提案やインポートなど、プログラムから原稿を変更するときに使う */
export const BlockEditSchema = z.object({
  op: z.enum(['replace', 'insert_after', 'delete']),
  /** 対象(insert_after では挿入位置の直前)のブロック id。先頭に挿入するときは null */
  blockId: z.string().nullable(),
  /** replace / insert_after で使う新しいテキスト(replace でタイトルだけ変えるときは省略) */
  text: z.string().optional(),
  /** 段落のタイトル(要点)。省略すると変えない */
  title: z.string().optional(),
  /** insert_after で作るブロックの種類(既定は段落) */
  kind: z.enum(['paragraph', 'heading']).optional(),
  /** 変更の理由(ユーザーへの説明) */
  reason: z.string().optional(),
});
export type BlockEdit = z.infer<typeof BlockEditSchema>;

export interface EditValidation {
  ok: boolean;
  errors: string[];
}

export function validateEdits(blocks: Block[], edits: BlockEdit[]): EditValidation {
  const ids = new Set(blocks.map((b) => b.id));
  const errors: string[] = [];
  edits.forEach((e, i) => {
    if (e.blockId !== null && !ids.has(e.blockId))
      errors.push(`edits[${i}]: blockId "${e.blockId}" は存在しません`);
    if (e.blockId === null && e.op !== 'insert_after')
      errors.push(`edits[${i}]: ${e.op} には blockId が必要です`);
    const hasText = e.text !== undefined && e.text.trim() !== '';
    const hasTitle = e.title !== undefined && e.title.trim() !== '';
    if (e.op === 'insert_after' && !hasText)
      errors.push(`edits[${i}]: insert_after には text が必要です`);
    if (e.op === 'replace' && !hasText && !hasTitle)
      errors.push(`edits[${i}]: replace には text か title が必要です`);
    if (e.op === 'delete' && e.blockId !== null) ids.delete(e.blockId);
  });
  return { ok: errors.length === 0, errors };
}

/** 編集を順に適用した新しいブロック列を返す(元の配列は変更しない) */
export function applyEdits(blocks: Block[], edits: BlockEdit[]): Block[] {
  let out = [...blocks];
  const insertionTail = new Map<string | null, string>();
  for (const e of edits) {
    if (e.op === 'replace') {
      out = out.map((b) =>
        b.id === e.blockId
          ? {
              ...b,
              text: e.text?.trim() ? e.text : b.text,
              title: e.title !== undefined && e.title.trim() ? e.title.trim() : b.title,
            }
          : b,
      );
    } else if (e.op === 'delete') {
      out = out.filter((b) => b.id !== e.blockId);
    } else {
      const anchor = insertionTail.get(e.blockId) ?? e.blockId;
      const i = anchor === null ? -1 : out.findIndex((b) => b.id === anchor);
      if (anchor !== null && i < 0) continue;
      const block = createBlock({
        kind: e.kind ?? 'paragraph',
        text: e.text ?? '',
        title: e.kind === 'heading' ? '' : (e.title?.trim() ?? ''),
      });
      out = [...out.slice(0, i + 1), block, ...out.slice(i + 1)];
      insertionTail.set(e.blockId, block.id);
    }
  }
  return out;
}
