import { blockLabel, type Block } from './document';
import type { DocumentEstimate } from './estimate';
import { getRole } from './roles';

/**
 * 時間配分の計画。見出しの `targetSec` はセクション全体、段落の `targetSec` はその段落の計画時間。
 * 計画の単位(行)は、見出しがあればセクション(最初の見出しより前の段落は段落ごと)、
 * なければ段落。
 */
export interface PlanRow {
  /** 計画を持つブロック(見出し、または段落)の id */
  id: string;
  kind: 'section' | 'paragraph';
  label: string;
  actualSec: number;
  targetSec: number | null;
  /** 「タイプの目安で割り振る」ときの重み */
  weight: number;
}

const roleWeight = (b: Block) => getRole(b.role)?.weight ?? 1;

export function planRows(blocks: Block[], est: DocumentEstimate): PlanRow[] {
  const rows: PlanRow[] = [];
  let section: PlanRow | null = null;
  let sectionHasParagraph = false;
  const closeSection = () => {
    if (section && !sectionHasParagraph) section.weight = 1;
  };
  let n = 0;
  for (const b of blocks) {
    if (b.kind === 'heading') {
      closeSection();
      section = {
        id: b.id,
        kind: 'section',
        label: b.text.trim() || '(無題の見出し)',
        actualSec: 0,
        targetSec: b.targetSec,
        weight: 0,
      };
      sectionHasParagraph = false;
      rows.push(section);
      continue;
    }
    n++;
    const e = est.byId.get(b.id);
    const sec = (e?.speakSec ?? 0) + (e?.pauseSec ?? 0);
    if (section) {
      section.actualSec += sec;
      section.weight += roleWeight(b);
      sectionHasParagraph = true;
    } else {
      rows.push({
        id: b.id,
        kind: 'paragraph',
        label: `段落${n}${blockLabel(b, 14) ? `: ${blockLabel(b, 14)}` : ''}`,
        actualSec: sec,
        targetSec: b.targetSec,
        weight: roleWeight(b),
      });
    }
  }
  closeSection();
  return rows;
}

export type DistributeMode = 'even' | 'current' | 'role';

/** 合計 total 秒を行に割り振る。5 秒単位に丸め、端数は最後の行で合わせる */
export function distribute(total: number, rows: PlanRow[], mode: DistributeMode): number[] {
  if (rows.length === 0) return [];
  const weights = rows.map((r) =>
    mode === 'even' ? 1 : mode === 'current' ? r.actualSec : r.weight,
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  const w = sum > 0 ? weights : rows.map(() => 1);
  const wSum = sum > 0 ? sum : rows.length;
  const step = total >= 60 ? 5 : 1;
  const out = w.map((x) => Math.round((total * x) / wSum / step) * step);
  const diff = total - out.reduce((a, b) => a + b, 0);
  out[out.length - 1] = Math.max(0, out[out.length - 1] + diff);
  return out;
}

export type PlanStatus = 'over' | 'under' | 'ok';

/** 計画との差。10% か 5 秒のどちらか大きいほうまでは「計画どおり」とみなす */
export function planStatus(actualSec: number, targetSec: number): PlanStatus {
  const tolerance = Math.max(5, targetSec * 0.1);
  if (actualSec > targetSec + tolerance) return 'over';
  if (actualSec < targetSec - tolerance) return 'under';
  return 'ok';
}

export function hasPlan(blocks: Block[]): boolean {
  return blocks.some((b) => b.targetSec !== null);
}
