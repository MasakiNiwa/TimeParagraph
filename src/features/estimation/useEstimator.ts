import { useEffect, useMemo } from 'react';
import type { Block } from '@/domain/document';
import { charEstimator, kanaEstimator, isSpoken, type Estimator } from '@/domain/estimate';
import { estimateMoraHeuristic } from '@/domain/mora';
import type { Settings } from '@/features/settings/settingsSchema';
import { useSettings } from '@/features/settings/settingsStore';
import { analyzeTexts, getCachedMora, useMorphStore } from './morphStore';

export type EstimationMethod = Settings['estimation']['method'];

export const methodInfo: Record<EstimationMethod, { label: string; description: string }> = {
  chars: {
    label: '文字数',
    description: '文字数を話す速さ(字/分)で割ります。わかりやすく、すぐに計算できます。',
  },
  kana: {
    label: '拍数(簡易)',
    description: '文字の種類から拍(モーラ)数を見積もります。漢字の多い文章でも安定します。',
  },
  morph: {
    label: '拍数(形態素解析)',
    description:
      '辞書で読みを調べて拍数を数えます。最も正確ですが、初回に辞書(約 18MB)を読み込みます。',
  },
};

const morphEstimator: Estimator = {
  id: 'morph',
  label: methodInfo.morph.label,
  unitLabel: '拍',
  // 解析が終わるまでは簡易推定で代用する
  countUnits: (text) => getCachedMora(text) ?? estimateMoraHeuristic(text),
};

const estimators: Record<EstimationMethod, Estimator> = {
  chars: charEstimator,
  kana: kanaEstimator,
  morph: morphEstimator,
};

/** 現在の設定に応じた推定方式と話速 */
export function useEstimator() {
  const { method, charsPerMinute, morasPerMinute, paragraphPauseSec } = useSettings().estimation;
  const morphVersion = useMorphStore((s) => (method === 'morph' ? s.version : 0));
  return useMemo(
    () => ({
      method,
      estimator: estimators[method],
      unitsPerMinute: method === 'chars' ? charsPerMinute : morasPerMinute,
      paragraphPauseSec,
      // 形態素解析の結果が更新されたら再計算させるためのキー
      cacheKey: morphVersion,
    }),
    [method, charsPerMinute, morasPerMinute, paragraphPauseSec, morphVersion],
  );
}

const ANALYZE_DELAY_MS = 300;

/** 形態素解析モードのとき、入力が落ち着いたら段落を Worker で解析する */
export function useMorphAnalysis(blocks: Block[] | undefined) {
  const method = useSettings().estimation.method;
  useEffect(() => {
    if (method !== 'morph' || !blocks) return;
    const timer = setTimeout(() => {
      void analyzeTexts(blocks.filter(isSpoken).map((b) => b.text));
    }, ANALYZE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [blocks, method]);
}
