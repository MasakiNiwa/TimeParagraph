import { Tooltip } from '@mantine/core';
import { formatDuration } from '@/domain/format';
import { useDocumentStore } from '../documentStore';
import { useEstimate } from '../useEstimate';
import classes from './AllocationBar.module.css';

const COLORS = ['calm', 'teal', 'grape', 'yellow', 'cyan', 'pink', 'lime', 'indigo'];

interface Segment {
  id: string;
  label: string;
  sec: number;
}

/** 時間配分バー。見出しがあればセクション単位、なければ段落単位で表示する */
export function AllocationBar() {
  const { estimate, sections } = useEstimate();
  const blocks = useDocumentStore((s) => s.doc?.blocks ?? []);
  const target = useDocumentStore((s) => s.doc?.targetDurationSec ?? null);

  const segments: Segment[] =
    sections.length > 1
      ? sections.map((s, i) => ({
          id: s.headingId ?? s.blockIds[0] ?? `s${i}`,
          label: s.title || (s.headingId ? '(無題の見出し)' : '(見出し前)'),
          sec: s.totalSec,
        }))
      : blocks
          .filter((b) => b.kind === 'paragraph')
          .map((b, i) => {
            const e = estimate.byId.get(b.id);
            return {
              id: b.id,
              label: `段落 ${i + 1}`,
              sec: (e?.speakSec ?? 0) + (e?.pauseSec ?? 0),
            };
          });

  const scale = Math.max(estimate.totalSec, target ?? 0);
  if (scale <= 0) return null;

  return (
    <div className={classes.track} role="img" aria-label="時間配分">
      {segments
        .filter((s) => s.sec > 0)
        .map((s, i) => (
          <Tooltip key={s.id} label={`${s.label} ・ ${formatDuration(s.sec)}`} withArrow>
            <button
              type="button"
              className={classes.segment}
              style={{
                width: `${(s.sec / scale) * 100}%`,
                background: `light-dark(var(--mantine-color-${COLORS[i % COLORS.length]}-5), var(--mantine-color-${COLORS[i % COLORS.length]}-8))`,
              }}
              onClick={() => useDocumentStore.getState().requestFocus(s.id)}
              aria-label={`${s.label} ${formatDuration(s.sec)}`}
            />
          </Tooltip>
        ))}
      {target !== null && target > 0 && (
        <div
          className={classes.target}
          style={{ left: `${(target / scale) * 100}%` }}
          title={`目標 ${formatDuration(target)}`}
        />
      )}
    </div>
  );
}
