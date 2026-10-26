import { useMemo } from 'react';
import { estimateDocument, summarizeSections } from '@/domain/estimate';
import { useSettings } from '@/features/settings/settingsStore';
import { useDocumentStore } from './documentStore';

export function useEstimate() {
  const blocks = useDocumentStore((s) => s.doc?.blocks);
  const { charsPerMinute, paragraphPauseSec } = useSettings().estimation;
  return useMemo(() => {
    const doc = { blocks: blocks ?? [] };
    const estimate = estimateDocument(doc, { charsPerMinute, paragraphPauseSec });
    return { estimate, sections: summarizeSections(doc, estimate) };
  }, [blocks, charsPerMinute, paragraphPauseSec]);
}
