import { z } from 'zod';

/**
 * 文書のデータ構造。保存・取込・AI 連携で共通に使う。
 * ブロックはフラットな配列で持ち、`heading` ブロックがセクションの区切りになる。
 * (並べ替えが単純になり、セクション構造は導出で得られる)
 */
export const DOCUMENT_SCHEMA_VERSION = 1;

export const BlockKindSchema = z.enum(['paragraph', 'heading']);
export type BlockKind = z.infer<typeof BlockKindSchema>;

export const BlockSchema = z.object({
  id: z.string().min(1),
  kind: BlockKindSchema.catch('paragraph'),
  text: z.string().catch(''),
  /** 段落のタイトル(この段落で言いたいことを短く。話す内容には含めない) */
  title: z.string().catch(''),
  /** 話す速さの倍率(1 = 設定どおり)。パラグラフごとにゆっくり/速めを指定する */
  speedFactor: z.number().min(0.25).max(4).catch(1),
  /** このブロックの後の間(秒)。null なら設定の既定値を使う */
  pauseAfterSec: z.number().min(0).max(600).nullable().catch(null),
  /** 話さないメモ(推定時間に含めない) */
  note: z.string().catch(''),
  /** 内容のタイプ(導入・結論・具体例など。domain/roles.ts の id)。null なら未設定 */
  role: z.string().nullable().catch(null),
  /** 書き方の案内(テンプレートから作った空の段落に薄く表示する。話す内容には含めない) */
  hint: z.string().catch(''),
});
export type Block = z.infer<typeof BlockSchema>;

export const DocumentSchema = z.object({
  schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION).default(DOCUMENT_SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().catch(''),
  /** 目標時間(秒)。null なら未設定 */
  targetDurationSec: z.number().min(0).nullable().catch(null),
  blocks: z
    .array(BlockSchema)
    .default([])
    .refine(
      (blocks) => new Set(blocks.map((b) => b.id)).size === blocks.length,
      'ブロック id が重複しています',
    )
    .transform((blocks) => (blocks.length ? blocks : [createBlock()])),
  createdAt: z.number().catch(() => Date.now()),
  updatedAt: z.number().catch(() => Date.now()),
});
export type TPDocument = z.infer<typeof DocumentSchema>;

export function newId(): string {
  return crypto.randomUUID();
}

export function createBlock(partial: Partial<Omit<Block, 'id'>> = {}): Block {
  return BlockSchema.parse({ id: newId(), ...partial });
}

export function createDocument(partial: Partial<Omit<TPDocument, 'id'>> = {}): TPDocument {
  const now = Date.now();
  return DocumentSchema.parse({
    id: newId(),
    title: '無題の原稿',
    targetDurationSec: null,
    blocks: [createBlock()],
    createdAt: now,
    updatedAt: now,
    ...partial,
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
  });
}

/** 保存データを読み込む。将来スキーマを変えたときはここで移行処理を行う */
export function parseDocument(input: unknown): TPDocument | null {
  const result = DocumentSchema.safeParse(input);
  return result.success ? result.data : null;
}

/** 段落の先頭行が「**タイトル**」だけなら、段落のタイトルとして扱う(Markdown の書き出しと対応) */
function paragraphFromLines(lines: string[]): Block {
  const m = /^\*\*(.+)\*\*$/.exec(lines[0]?.trim() ?? '');
  if (m && lines.length > 1)
    return createBlock({ title: m[1].trim(), text: lines.slice(1).join('\n') });
  return createBlock({ text: lines.join('\n') });
}

/** 段落を表す短いラベル。タイトルがあればタイトル、なければ本文の冒頭 */
export function blockLabel(block: Pick<Block, 'title' | 'text'>, n = 24): string {
  const t = block.title.trim() || block.text.trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** 空行区切りのテキストをブロック列に変換する。`# ` で始まる行は見出しとして扱う */
export function textToBlocks(text: string): Block[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) => {
      const lines = chunk.split('\n');
      const blocks: Block[] = [];
      let buf: string[] = [];
      const flush = () => {
        if (buf.length) blocks.push(paragraphFromLines(buf));
        buf = [];
      };
      for (const line of lines) {
        const m = /^#{1,6}\s+(.*)$/.exec(line);
        if (m) {
          flush();
          blocks.push(createBlock({ kind: 'heading', text: m[1].trim() }));
        } else {
          buf.push(line);
        }
      }
      flush();
      return blocks;
    });
}
