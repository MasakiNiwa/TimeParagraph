import {
  createDocument,
  DOCUMENT_SCHEMA_VERSION,
  newId,
  parseDocument,
  textToBlocks,
  type Block,
  type TPDocument,
} from './document';
import type { DocumentEstimate } from './estimate';
import { formatDuration } from './format';

/** 書き出し用の JSON。アプリ名とスキーマ版を付けて、取り込み時に判別できるようにする */
export function exportJson(doc: TPDocument): string {
  return JSON.stringify(
    { format: 'timeparagraph', schemaVersion: DOCUMENT_SCHEMA_VERSION, document: doc },
    null,
    2,
  );
}

/** Markdown(見出しは「## 」、段落は空行区切り)。メモは引用として残す */
export function exportMarkdown(doc: TPDocument): string {
  const lines: string[] = [`# ${doc.title || '無題の原稿'}`, ''];
  for (const b of doc.blocks) {
    if (!b.text.trim()) continue;
    if (b.kind === 'heading') lines.push(`## ${b.text.trim()}`, '');
    else {
      lines.push(b.text.trim(), '');
      if (b.note.trim())
        lines.push(
          ...b.note
            .trim()
            .split('\n')
            .map((l) => `> ${l}`),
          '',
        );
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}

/** 印刷・共有向けのテキスト(段落ごとの開始時刻と所要時間つき) */
export function exportTimedText(doc: TPDocument, est: DocumentEstimate): string {
  const lines: string[] = [
    doc.title || '無題の原稿',
    `合計 ${formatDuration(est.totalSec)}` +
      (doc.targetDurationSec !== null ? ` / 目標 ${formatDuration(doc.targetDurationSec)}` : ''),
    '',
  ];
  let n = 0;
  for (const b of doc.blocks) {
    if (!b.text.trim()) continue;
    if (b.kind === 'heading') {
      lines.push(`■ ${b.text.trim()}`, '');
      continue;
    }
    const e = est.byId.get(b.id);
    n++;
    lines.push(
      `[${n}] ${formatDuration(e?.startSec ?? 0)}〜(約 ${formatDuration(e?.speakSec ?? 0)})`,
      b.text.trim(),
      '',
    );
  }
  return lines.join('\n').trimEnd() + '\n';
}

export type ImportResult = { ok: true; doc: TPDocument } | { ok: false; error: string };

/**
 * ファイルの内容から原稿を作る。JSON(このアプリの書き出し)と Markdown / テキストに対応。
 * 取り込んだ原稿には新しい id を振り、既存の原稿を上書きしない。
 */
export function importDocument(content: string, fileName = ''): ImportResult {
  const trimmed = content.trim();
  const isText = /\.(md|markdown|txt)$/i.test(fileName);
  if (/\.json$/i.test(fileName) || (!isText && trimmed.startsWith('{'))) {
    try {
      const json = JSON.parse(trimmed);
      if (json?.format === 'timeparagraph' && json.schemaVersion !== DOCUMENT_SCHEMA_VERSION)
        return { ok: false, error: 'このバージョンの原稿データには対応していません' };
      const doc = parseDocument(json?.format === 'timeparagraph' ? json.document : json);
      if (!doc) return { ok: false, error: 'TimeParagraph の原稿データとして読み込めませんでした' };
      const now = Date.now();
      return {
        ok: true,
        doc: {
          ...doc,
          id: newId(),
          blocks: doc.blocks.map((b) => ({ ...b, id: newId() })),
          createdAt: now,
          updatedAt: now,
        },
      };
    } catch {
      return { ok: false, error: 'JSON の形式が正しくありません' };
    }
  }

  // Markdown: 先頭の「# 」をタイトルに、「> 」の引用は話さないメモとして直前の段落に付ける
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  let title = fileName.replace(/\.[^.]+$/, '') || '取り込んだ原稿';
  const firstIdx = lines.findIndex((l) => l.trim());
  if (firstIdx >= 0 && /^#\s+/.test(lines[firstIdx])) {
    title = lines[firstIdx].replace(/^#\s+/, '').trim();
    lines.splice(firstIdx, 1);
  }
  const blocks: Block[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) blocks.push(...textToBlocks(buf.join('\n')));
    buf = [];
  };
  for (const line of lines) {
    const quote = /^>\s?(.*)$/.exec(line);
    if (!quote) {
      buf.push(line);
      continue;
    }
    flush();
    const last = blocks[blocks.length - 1];
    if (last?.kind === 'paragraph') last.note = last.note ? `${last.note}\n${quote[1]}` : quote[1];
  }
  flush();
  if (blocks.length === 0) return { ok: false, error: '取り込める段落がありません' };
  return { ok: true, doc: createDocument({ title, blocks }) };
}
