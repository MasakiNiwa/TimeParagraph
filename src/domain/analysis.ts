import type { Block, TPDocument } from './document';
import type { DocumentEstimate, EstimateOptions, Estimator, SectionSummary } from './estimate';
import { splitSentences } from './sentences';

/** ドリルダウン用の時間ツリー(全体 → セクション → 段落 → 文) */
export interface TimeNode {
  id: string;
  level: 'document' | 'section' | 'paragraph' | 'sentence';
  label: string;
  /** 話す時間 + 間(秒) */
  sec: number;
  units: number;
  /** エディタで対応するブロック */
  blockId?: string;
  children?: TimeNode[];
}

const excerpt = (text: string, n = 24) => (text.length > n ? `${text.slice(0, n)}…` : text);

export function buildTimeTree(
  doc: Pick<TPDocument, 'title' | 'blocks'>,
  est: DocumentEstimate,
  sections: SectionSummary[],
  opts: EstimateOptions,
  estimator: Pick<Estimator, 'countUnits'>,
): TimeNode {
  const blocks = new Map(doc.blocks.map((b) => [b.id, b]));
  let paragraphNo = 0;

  const sectionNodes = sections.map((s, si): TimeNode => {
    const paragraphs = s.blockIds
      .map((id) => blocks.get(id))
      .filter((b): b is Block => b !== undefined && b.text.trim() !== '')
      .map((b): TimeNode => {
        paragraphNo++;
        const e = est.byId.get(b.id);
        const sentences = splitSentences(b.text).map((text, i): TimeNode => {
          const units = estimator.countUnits(text);
          return {
            id: `${b.id}:${i}`,
            level: 'sentence',
            label: excerpt(text),
            sec: ((units / opts.unitsPerMinute) * 60) / b.speedFactor,
            units,
            blockId: b.id,
          };
        });
        return {
          id: b.id,
          level: 'paragraph',
          label: `段落${paragraphNo}: ${excerpt(b.text, 16)}`,
          sec: (e?.speakSec ?? 0) + (e?.pauseSec ?? 0),
          units: e?.units ?? 0,
          blockId: b.id,
          children: sentences,
        };
      });
    return {
      id: s.headingId ?? `section-${si}`,
      level: 'section',
      label: s.title || (s.headingId ? '(無題の見出し)' : '(見出しなし)'),
      sec: s.totalSec,
      units: paragraphs.reduce((a, p) => a + p.units, 0),
      blockId: s.headingId ?? undefined,
      children: paragraphs,
    };
  });

  // 見出しがない原稿は、セクション階層を省いて段落から始める
  const children =
    sectionNodes.length === 1 && sectionNodes[0].level === 'section' && !sections[0].headingId
      ? sectionNodes[0].children
      : sectionNodes;

  return {
    id: 'root',
    level: 'document',
    label: doc.title || '無題の原稿',
    sec: est.totalSec,
    units: est.totalUnits,
    children,
  };
}

/** ツリーをパス(id の列)でたどる */
export function findPath(root: TimeNode, path: string[]): TimeNode[] {
  const nodes = [root];
  let cur = root;
  for (const id of path) {
    const next = cur.children?.find((c) => c.id === id);
    if (!next) break;
    nodes.push(next);
    cur = next;
  }
  return nodes;
}

export interface ParagraphStat {
  blockId: string;
  index: number;
  label: string;
  sec: number;
  /** 中央値に対する比 */
  ratio: number;
}

export interface ParagraphStats {
  count: number;
  meanSec: number;
  medianSec: number;
  maxSec: number;
  minSec: number;
  /** 中央値の 2 倍以上の長い段落 */
  long: ParagraphStat[];
  /** 中央値の 1/3 以下の短い段落 */
  short: ParagraphStat[];
  all: ParagraphStat[];
}

export function paragraphStats(
  doc: Pick<TPDocument, 'blocks'>,
  est: DocumentEstimate,
): ParagraphStats {
  const all: ParagraphStat[] = [];
  for (const b of doc.blocks) {
    if (b.kind !== 'paragraph' || !b.text.trim()) continue;
    const e = est.byId.get(b.id);
    all.push({
      blockId: b.id,
      index: all.length + 1,
      label: excerpt(b.text, 20),
      sec: e?.speakSec ?? 0,
      ratio: 0,
    });
  }
  const secs = all.map((p) => p.sec).sort((a, b) => a - b);
  const n = secs.length;
  const median = n === 0 ? 0 : n % 2 ? secs[(n - 1) / 2] : (secs[n / 2 - 1] + secs[n / 2]) / 2;
  for (const p of all) p.ratio = median > 0 ? p.sec / median : 0;
  return {
    count: n,
    meanSec: n ? secs.reduce((a, b) => a + b, 0) / n : 0,
    medianSec: median,
    maxSec: n ? secs[n - 1] : 0,
    minSec: n ? secs[0] : 0,
    long: n >= 3 ? all.filter((p) => p.ratio >= 2) : [],
    short: n >= 3 ? all.filter((p) => p.ratio > 0 && p.ratio <= 1 / 3) : [],
    all,
  };
}

export interface LongSentence {
  blockId: string;
  text: string;
  units: number;
}

/** 一息で話すには長い文(既定: 80 字/拍超) */
export function findLongSentences(
  doc: Pick<TPDocument, 'blocks'>,
  estimator: Pick<Estimator, 'countUnits'>,
  threshold = 80,
): LongSentence[] {
  const out: LongSentence[] = [];
  for (const b of doc.blocks) {
    if (b.kind !== 'paragraph') continue;
    for (const text of splitSentences(b.text)) {
      const units = estimator.countUnits(text);
      if (units > threshold) out.push({ blockId: b.id, text, units });
    }
  }
  return out.sort((a, b) => b.units - a.units);
}
