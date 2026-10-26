import { tool } from 'ai';
import { z } from 'zod';
import { applyEdits, BlockEditSchema, validateEdits } from '@/domain/edits';
import { newId } from '@/domain/document';
import { analysisTools } from '@/features/analysis/tools';
import type { AnalysisContext } from '@/features/analysis/types';
import type { Settings } from '@/features/settings/settingsSchema';
import { buildAppState, totalSecOf } from './appState';
import { useAiStore, type Proposal } from './aiStore';

const r1 = (n: number) => Math.round(n * 10) / 10;

/** ツール名と画面に表示する説明 */
export const toolLabels: Record<string, string> = {
  get_document_state: '原稿の状態を取得',
  estimate_text: '話す時間を計算',
  run_analysis: '分析ツールを実行',
  propose_edits: '編集案を作成',
};

/**
 * AI が呼び出せるアプリの機能。計算はすべてアプリのアルゴリズムで行い、
 * AI は結果を解釈して提案する。原稿の変更は提案として保存し、ユーザーが適用を決める。
 */
export function createAiTools(
  getCtx: () => AnalysisContext | null,
  getSettings: () => Settings,
  onProposal: (id: string) => void,
) {
  const requireCtx = () => {
    const ctx = getCtx();
    if (!ctx) throw new Error('原稿が読み込まれていません');
    return ctx;
  };

  return {
    get_document_state: tool({
      description:
        '現在の原稿の状態(ブロック一覧・推定時間・目標時間・セクション)を JSON で取得する。ユーザーが原稿を変更した可能性があるときに呼ぶ。',
      inputSchema: z.object({}),
      execute: async () => buildAppState(requireCtx(), getSettings()),
    }),

    estimate_text: tool({
      description:
        'テキストを話すのにかかる時間を、アプリの推定方式(現在の設定)で計算する。書き換え案の長さを確かめるときに使う。',
      inputSchema: z.object({
        texts: z.array(z.string()).min(1).max(20).describe('計算するテキストの配列'),
      }),
      execute: async ({ texts }) => {
        const ctx = requireCtx();
        return texts.map((text) => {
          const units = ctx.estimator.countUnits(text);
          return {
            units: r1(units),
            unit: ctx.estimator.unitLabel,
            seconds: r1((units / ctx.unitsPerMinute) * 60),
          };
        });
      },
    }),

    run_analysis: tool({
      description: `分析ツールを実行して結果を取得する。利用できるツール: ${analysisTools
        .filter((t) => t.summarize)
        .map((t) => `${t.id}(${t.title}: ${t.description})`)
        .join(' / ')}`,
      inputSchema: z.object({
        toolId: z.enum(analysisTools.filter((t) => t.summarize).map((t) => t.id) as [string]),
      }),
      execute: async ({ toolId }) => {
        const t = analysisTools.find((x) => x.id === toolId);
        return t?.summarize?.(requireCtx()) ?? null;
      },
    }),

    propose_edits: tool({
      description:
        '原稿の編集案を作成する。原稿は直接変更されず、ユーザーが画面で確認して適用する。結果として、適用前後の合計推定時間(秒)が返る。blockId は get_document_state の id を使う。',
      inputSchema: z.object({
        summary: z.string().describe('編集案の要約(ユーザーに表示する)'),
        edits: z.array(BlockEditSchema).min(1),
      }),
      execute: async ({ summary, edits }) => {
        const ctx = requireCtx();
        const settings = getSettings();
        const validation = validateEdits(ctx.doc.blocks, edits);
        if (!validation.ok) return { ok: false, errors: validation.errors };
        const beforeSec = totalSecOf(ctx, settings, ctx.doc.blocks);
        const afterSec = totalSecOf(ctx, settings, applyEdits(ctx.doc.blocks, edits));
        const proposal: Proposal = {
          id: newId(),
          summary,
          edits,
          beforeSec,
          afterSec,
          status: 'pending',
        };
        useAiStore.setState((s) => ({
          proposals: { ...s.proposals, [proposal.id]: proposal },
        }));
        onProposal(proposal.id);
        return {
          ok: true,
          proposalId: proposal.id,
          beforeSec: r1(beforeSec),
          afterSec: r1(afterSec),
          deltaSec: r1(afterSec - beforeSec),
          targetDurationSec: ctx.doc.targetDurationSec,
        };
      },
    }),
  };
}
