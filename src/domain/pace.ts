import type { Block } from './document';
import { isSpoken, type DocumentEstimate } from './estimate';

/**
 * 発表・リハーサル中のペースの基準。段落ごとに「何秒で話す予定か」を決める。
 * - plan: 時間配分の計画がある(段落の計画、なければセクションの計画を推定の比で配分)
 * - target: 計画はないが目標時間がある(推定を目標時間に合わせて伸縮)
 * - estimate: どちらもない(推定のまま)
 */
export type PaceBasis = 'plan' | 'target' | 'estimate';

export const PACE_BASIS_LABELS: Record<PaceBasis, string> = {
  plan: '計画',
  target: '目標ペース',
  estimate: '推定',
};

export interface PaceSchedule {
  basis: PaceBasis;
  /** 話す段落ごとの予定時間(秒、段落の後の間を含む) */
  byId: Map<string, number>;
  totalSec: number;
}

export function paceSchedule(
  blocks: Block[],
  est: DocumentEstimate,
  targetDurationSec: number | null,
): PaceSchedule {
  const estOf = (b: Block) => {
    const e = est.byId.get(b.id);
    return (e?.speakSec ?? 0) + (e?.pauseSec ?? 0);
  };
  const spoken = blocks.filter(isSpoken);
  const byId = new Map<string, number>();

  if (blocks.some((b) => b.targetSec !== null)) {
    let section: { target: number | null; paragraphs: Block[] } = { target: null, paragraphs: [] };
    const flush = () => {
      const { target, paragraphs } = section;
      const spokenHere = paragraphs.filter(isSpoken);
      if (target === null) {
        for (const b of spokenHere) byId.set(b.id, b.targetSec ?? estOf(b));
        return;
      }
      // 段落に計画があればそれを使い、残りをほかの段落へ推定の比で配分する
      const fixed = spokenHere.filter((b) => b.targetSec !== null);
      const free = spokenHere.filter((b) => b.targetSec === null);
      for (const b of fixed) byId.set(b.id, b.targetSec!);
      const rest = Math.max(0, target - fixed.reduce((a, b) => a + b.targetSec!, 0));
      const weight = free.reduce((a, b) => a + estOf(b), 0);
      for (const b of free)
        byId.set(b.id, weight > 0 ? (rest * estOf(b)) / weight : rest / free.length);
    };
    for (const b of blocks) {
      if (b.kind === 'heading') {
        flush();
        section = { target: b.targetSec, paragraphs: [] };
      } else section.paragraphs.push(b);
    }
    flush();
    return { basis: 'plan', byId, totalSec: sum(byId) };
  }

  const total = spoken.reduce((a, b) => a + estOf(b), 0);
  if (targetDurationSec !== null && targetDurationSec > 0 && total > 0) {
    const k = targetDurationSec / total;
    for (const b of spoken) byId.set(b.id, estOf(b) * k);
    return { basis: 'target', byId, totalSec: sum(byId) };
  }
  for (const b of spoken) byId.set(b.id, estOf(b));
  return { basis: 'estimate', byId, totalSec: total };
}

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

/**
 * 予定との差(秒)。正なら遅れ、負なら先行。
 * 現在の段落は、予定時間を超えるまでは予定どおりとみなす(話している途中で遅れと出さない)
 */
export function paceDrift(
  plannedSecs: number[],
  index: number,
  segmentSec: number,
  elapsedSec: number,
): number {
  const before = plannedSecs.slice(0, index).reduce((a, b) => a + b, 0);
  return elapsedSec - (before + Math.min(segmentSec, plannedSecs[index] ?? 0));
}

/** 「+0:12 計画より遅れ」「−0:05 計画より先行」「計画どおり」のような表示 */
export function paceText(drift: number, basis: PaceBasis): string {
  const label = PACE_BASIS_LABELS[basis];
  if (Math.abs(drift) < 1) return `${label}どおり`;
  const s = Math.round(Math.abs(drift));
  const t = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return drift > 0 ? `+${t} ${label}より遅れ` : `−${t} ${label}より先行`;
}
