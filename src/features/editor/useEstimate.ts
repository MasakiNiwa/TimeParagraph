import { useMemo } from 'react';
import { estimateDocument, summarizeSections } from '@/domain/estimate';
import { useEstimator } from '@/features/estimation/useEstimator';
import { useDocumentStore } from './documentStore';

export function useEstimate() {
  const blocks = useDocumentStore((s) => s.doc?.blocks);
  const { estimator, unitsPerMinute, paragraphPauseSec, cacheKey } = useEstimator();
  return useMemo(() => {
    void cacheKey;
    const doc = { blocks: blocks ?? [] };
    const estimate = estimateDocument(doc, { unitsPerMinute, paragraphPauseSec }, estimator);
    return {
      estimate,
      sections: summarizeSections(doc, estimate),
      unitLabel: estimator.unitLabel,
    };
  }, [blocks, estimator, unitsPerMinute, paragraphPauseSec, cacheKey]);
}
