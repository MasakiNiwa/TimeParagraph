import type { ComponentType } from 'react';
import type { ParagraphStats, TimeNode } from '@/domain/analysis';
import type { TPDocument } from '@/domain/document';
import type { DocumentEstimate, Estimator, SectionSummary } from '@/domain/estimate';
import type { Rehearsal } from '@/domain/rehearsal';

/** 分析ツールに渡す共通のデータ。ツールはここから必要なものを取り出す */
export interface AnalysisContext {
  doc: TPDocument;
  estimate: DocumentEstimate;
  sections: SectionSummary[];
  tree: TimeNode;
  stats: ParagraphStats;
  estimator: Pick<Estimator, 'countUnits' | 'unitLabel'>;
  unitsPerMinute: number;
  rehearsals: Rehearsal[];
  /** エディタで該当ブロックを開く */
  openInEditor: (blockId: string) => void;
}

/**
 * 分析ツール。`tools/index.ts` の一覧に追加するだけで分析ページに表示される。
 * `summarize` は AI 連携で使う構造化データ(JSON にできる値)を返す。
 */
export interface AnalysisTool {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number | string; stroke?: number }>;
  component: ComponentType<{ ctx: AnalysisContext }>;
  summarize?: (ctx: AnalysisContext) => unknown;
}
