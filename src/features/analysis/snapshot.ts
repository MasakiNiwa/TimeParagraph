import { analysisTools } from './tools';
import type { AnalysisContext } from './types';

/** 全分析ツールの要約を 1 つの構造化データにまとめる(AI 連携・書き出し用) */
export function buildAnalysisSnapshot(ctx: AnalysisContext) {
  return Object.fromEntries(
    analysisTools.filter((t) => t.summarize).map((t) => [t.id, t.summarize!(ctx)]),
  );
}
