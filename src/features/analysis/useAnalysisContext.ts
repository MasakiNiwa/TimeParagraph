import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildTimeTree, paragraphStats } from '@/domain/analysis';
import { useDocumentStore } from '@/features/editor/documentStore';
import { useEstimate } from '@/features/editor/useEstimate';
import { useEstimator } from '@/features/estimation/useEstimator';
import { listRehearsals } from '@/features/rehearsal/rehearsalStore';
import type { AnalysisContext } from './types';

export function useAnalysisContext(): AnalysisContext | null {
  const doc = useDocumentStore((s) => s.doc);
  const { estimate, sections } = useEstimate();
  const { estimator, unitsPerMinute, paragraphPauseSec } = useEstimator();
  const rehearsals = useLiveQuery(() => (doc ? listRehearsals(doc.id) : []), [doc?.id]);
  const navigate = useNavigate();

  return useMemo(() => {
    if (!doc) return null;
    return {
      doc,
      estimate,
      sections,
      tree: buildTimeTree(
        doc,
        estimate,
        sections,
        { unitsPerMinute, paragraphPauseSec },
        estimator,
      ),
      stats: paragraphStats(doc, estimate),
      estimator,
      unitsPerMinute,
      rehearsals: rehearsals ?? [],
      openInEditor: (blockId: string) => {
        navigate('/');
        // エディタの描画後にフォーカスする
        setTimeout(() => useDocumentStore.getState().requestFocus(blockId), 50);
      },
    };
  }, [doc, estimate, sections, estimator, unitsPerMinute, paragraphPauseSec, rehearsals, navigate]);
}
