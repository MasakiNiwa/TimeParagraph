import type { AnalysisTool } from '../types';
import { longSentencesTool } from './LongSentences';
import { paragraphBalanceTool } from './ParagraphBalance';
import { planCompareTool } from './PlanCompare';
import { paragraphStructureTool } from './ParagraphStructure';
import { rehearsalCompareTool } from './RehearsalCompare';
import { timeDrilldownTool } from './TimeDrilldown';

/** 分析ツールの一覧。新しいツールはここに追加する */
export const analysisTools: AnalysisTool[] = [
  timeDrilldownTool,
  planCompareTool,
  paragraphStructureTool,
  paragraphBalanceTool,
  longSentencesTool,
  rehearsalCompareTool,
];
