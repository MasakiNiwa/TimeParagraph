import { useMemo } from 'react';
import { isSpoken } from '@/domain/estimate';
import { useDocumentStore } from '@/features/editor/documentStore';
import { useEstimate } from '@/features/editor/useEstimate';
import type { RehearsalItem } from '@/features/rehearsal/rehearsalStore';

/** 練習画面で使う、話す段落の一覧と推定値 */
export function usePracticeItems() {
  const doc = useDocumentStore((s) => s.doc);
  const { estimate } = useEstimate();
  const items = useMemo<RehearsalItem[]>(
    () =>
      (doc?.blocks ?? []).filter(isSpoken).map((b) => {
        const e = estimate.byId.get(b.id);
        return {
          blockId: b.id,
          excerpt: b.title.trim() || b.text.slice(0, 40),
          estimatedSec: (e?.speakSec ?? 0) + (e?.pauseSec ?? 0),
          pauseSec: e?.pauseSec ?? 0,
          weightedUnits: (e?.units ?? 0) / b.speedFactor,
        };
      }),
    [doc, estimate],
  );
  return { doc, estimate, items };
}
