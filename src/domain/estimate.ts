import type { Block, TPDocument } from './document';
import { estimateMoraHeuristic } from './mora';

/** 推定に使う設定値 */
export interface EstimateOptions {
  /** 1 分あたりに話す単位数(文字数またはモーラ数) */
  unitsPerMinute: number;
  paragraphPauseSec: number;
}

/**
 * 話す時間の推定方式。`countUnits` が返す単位数(文字数・モーラ数など)を話速で割って時間にする。
 * 方式を増やすときは Estimator を追加して `estimationMethods` に登録する。
 */
export interface Estimator {
  id: string;
  label: string;
  unitLabel: string;
  countUnits: (text: string) => number;
}

const IGNORED =
  /[\s\u3000\u300c\u300d\u300e\u300f()\uff08\uff09[\]\u3010\u3011\u3008\u3009\u300a\u300b"'\u201c\u201d\u2018\u2019]/gu;

/** 読み上げ対象の文字数(空白・括弧類は数えない。句読点は間として数える) */
export function countSpokenChars(text: string): number {
  return [...text.replace(IGNORED, '')].length;
}

export const charEstimator: Estimator = {
  id: 'chars',
  label: '文字数',
  unitLabel: '字',
  countUnits: countSpokenChars,
};

export const kanaEstimator: Estimator = {
  id: 'kana',
  label: '拍数(簡易)',
  unitLabel: '拍',
  countUnits: estimateMoraHeuristic,
};

export interface BlockEstimate {
  id: string;
  units: number;
  speakSec: number;
  pauseSec: number;
  /** 文書の先頭からの開始時刻(秒) */
  startSec: number;
}

export interface DocumentEstimate {
  blocks: BlockEstimate[];
  byId: Map<string, BlockEstimate>;
  totalSec: number;
  totalUnits: number;
  paragraphCount: number;
}

export function isSpoken(block: Block): boolean {
  return block.kind === 'paragraph' && block.text.trim().length > 0;
}

export function estimateDocument(
  doc: Pick<TPDocument, 'blocks'>,
  opts: EstimateOptions,
  estimator: Pick<Estimator, 'countUnits'> = charEstimator,
): DocumentEstimate {
  const spokenIdx = doc.blocks.map((b, i) => (isSpoken(b) ? i : -1)).filter((i) => i >= 0);
  const lastSpoken = spokenIdx[spokenIdx.length - 1] ?? -1;

  let t = 0;
  let totalUnits = 0;
  const blocks = doc.blocks.map((b, i): BlockEstimate => {
    const startSec = t;
    if (!isSpoken(b)) return { id: b.id, units: 0, speakSec: 0, pauseSec: 0, startSec };
    const units = estimator.countUnits(b.text);
    const speakSec = ((units / opts.unitsPerMinute) * 60) / b.speedFactor;
    // 最後のパラグラフの後には間を入れない
    const pauseSec = i === lastSpoken ? 0 : (b.pauseAfterSec ?? opts.paragraphPauseSec);
    t += speakSec + pauseSec;
    totalUnits += units;
    return { id: b.id, units, speakSec, pauseSec, startSec };
  });

  return {
    blocks,
    byId: new Map(blocks.map((b) => [b.id, b])),
    totalSec: t,
    totalUnits,
    paragraphCount: spokenIdx.length,
  };
}

export interface SectionSummary {
  /** 見出しブロックの id(最初の見出しより前は null) */
  headingId: string | null;
  title: string;
  blockIds: string[];
  totalSec: number;
  startSec: number;
}

/** 見出しで区切ったセクションごとの合計時間 */
export function summarizeSections(
  doc: Pick<TPDocument, 'blocks'>,
  est: DocumentEstimate,
): SectionSummary[] {
  const sections: SectionSummary[] = [];
  let cur: SectionSummary = { headingId: null, title: '', blockIds: [], totalSec: 0, startSec: 0 };
  for (const b of doc.blocks) {
    const e = est.byId.get(b.id);
    if (b.kind === 'heading') {
      if (cur.headingId !== null || cur.blockIds.length) sections.push(cur);
      cur = {
        headingId: b.id,
        title: b.text,
        blockIds: [],
        totalSec: 0,
        startSec: e?.startSec ?? 0,
      };
      continue;
    }
    cur.blockIds.push(b.id);
    if (e) cur.totalSec += e.speakSec + e.pauseSec;
  }
  if (cur.headingId !== null || cur.blockIds.length) sections.push(cur);
  return sections;
}
