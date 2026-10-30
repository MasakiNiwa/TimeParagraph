import { estimateDocument } from '@/domain/estimate';
import { getRole } from '@/domain/roles';
import type { Block } from '@/domain/document';
import { APP_NAME, APP_VERSION } from '@/lib/appInfo';
import { longSentencesTool } from '@/features/analysis/tools/LongSentences';
import { paragraphStructureTool } from '@/features/analysis/tools/ParagraphStructure';
import { planCompareTool } from '@/features/analysis/tools/PlanCompare';
import { paragraphBalanceTool } from '@/features/analysis/tools/ParagraphBalance';
import type { AnalysisContext } from '@/features/analysis/types';
import type { Settings } from '@/features/settings/settingsSchema';

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * AI に見せるブロックの参照名(B1, B2, ...)。長い UUID は AI が書き写し間違えやすいため、
 * 短い参照名でやり取りし、アプリ側で id に変換する。
 */
export const blockRef = (index: number) => `B${index + 1}`;

/** 参照名からブロックの位置を求める。見つからなければ -1 */
export function refToIndex(ref: string, count: number): number {
  const m = /^B(\d+)$/i.exec(ref.trim());
  const i = m ? Number(m[1]) - 1 : -1;
  return i >= 0 && i < count ? i : -1;
}

/**
 * AI に渡すアプリの状態。AI は数値を推測せず、ここに含まれる値とツールの結果を使う。
 * フィールドを増やすときは後方互換を保つ(AI のプロンプトはこの形を前提にしている)。
 */
export function buildAppState(ctx: AnalysisContext, settings: Settings) {
  const { doc, estimate, sections } = ctx;
  const target = doc.targetDurationSec;
  return {
    app: { name: APP_NAME, version: APP_VERSION },
    document: {
      title: doc.title,
      targetDurationSec: target,
      totalEstimatedSec: r1(estimate.totalSec),
      diffFromTargetSec: target === null ? null : r1(estimate.totalSec - target),
      paragraphCount: estimate.paragraphCount,
    },
    estimation: {
      method: settings.estimation.method,
      unit: ctx.estimator.unitLabel,
      unitsPerMinute: ctx.unitsPerMinute,
      paragraphPauseSec: settings.estimation.paragraphPauseSec,
    },
    sections: sections.map((s) => ({
      title: s.title || null,
      startSec: r1(s.startSec),
      totalSec: r1(s.totalSec),
    })),
    blocks: doc.blocks.map((b, index) => {
      const e = estimate.byId.get(b.id);
      return {
        ref: blockRef(index),
        kind: b.kind,
        // 内容のタイプ(導入・結論・具体例など)。構成を把握するために渡す
        role: getRole(b.role)?.label,
        // 段落のタイトル(書き手が付けた要点のメモ)
        title: b.title || undefined,
        // 計画した時間(見出しはセクション全体、段落はその段落)。未設定なら省く
        plannedSec: b.targetSec ?? undefined,
        text: b.text,
        ...(b.kind === 'paragraph'
          ? {
              units: r1(e?.units ?? 0),
              speakSec: r1(e?.speakSec ?? 0),
              pauseAfterSec: r1(e?.pauseSec ?? 0),
              startSec: r1(e?.startSec ?? 0),
              speedFactor: b.speedFactor,
              note: b.note || undefined,
            }
          : {}),
      };
    }),
    // よく使う分析結果を最初から渡し、ツール呼び出しの往復を減らす
    analysis: {
      paragraphBalance: paragraphBalanceTool.summarize?.(ctx),
      plan: planCompareTool.summarize?.(ctx),
      paragraphStructure: paragraphStructureTool.summarize?.(ctx),
      longSentences: longSentencesTool.summarize?.(ctx),
    },
    rehearsals: ctx.rehearsals.slice(0, 3).map((r) => ({
      date: new Date(r.startedAt).toISOString(),
      totalSec: r1(r.totalSec),
      estimatedTotalSec: r1(r.estimatedTotalSec),
      completed: r.completed,
    })),
  };
}

export type AppState = ReturnType<typeof buildAppState>;

/** ブロック列の合計時間を現在の推定方式で計算する */
export function totalSecOf(ctx: AnalysisContext, settings: Settings, blocks: Block[]): number {
  return estimateDocument(
    { blocks },
    {
      unitsPerMinute: ctx.unitsPerMinute,
      paragraphPauseSec: settings.estimation.paragraphPauseSec,
    },
    ctx.estimator,
  ).totalSec;
}
