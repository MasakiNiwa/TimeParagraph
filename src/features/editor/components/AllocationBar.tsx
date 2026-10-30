import { Tooltip } from '@mantine/core';
import { formatDuration } from '@/domain/format';
import { hasPlan, planRows } from '@/domain/plan';
import { usePlanModal } from '../editorUiStore';
import { useDocumentStore } from '../documentStore';
import { useEstimate } from '../useEstimate';
import classes from './AllocationBar.module.css';

const COLORS = ['calm', 'teal', 'grape', 'yellow', 'cyan', 'pink', 'lime', 'indigo'];

interface Segment {
  id: string;
  label: string;
  sec: number;
}

/** 計画の帯で、その行より前の計画時間の合計 */
const planStart = (rows: { targetSec: number | null }[], i: number) =>
  rows.slice(0, i).reduce((a, r) => a + (r.targetSec ?? 0), 0);

/** 時間配分バー。見出しがあればセクション単位、なければ段落単位で表示する */
export function AllocationBar() {
  const { estimate, sections } = useEstimate();
  const blocks = useDocumentStore((s) => s.doc?.blocks ?? []);
  const target = useDocumentStore((s) => s.doc?.targetDurationSec ?? null);

  const planned = hasPlan(blocks);
  // 計画があるときは、計画と同じ単位(planRows)で並べて、色をそろえる
  const rows = planned ? planRows(blocks, estimate) : [];
  const segments: Segment[] = planned
    ? rows.map((r) => ({ id: r.id, label: r.label, sec: r.actualSec }))
    : sections.length > 1
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

  const plannedTotal = rows.reduce((a, r) => a + (r.targetSec ?? 0), 0);
  const scale = Math.max(estimate.totalSec, target ?? 0, plannedTotal);
  if (scale <= 0) return null;
  const color = (i: number) =>
    `light-dark(var(--mantine-color-${COLORS[i % COLORS.length]}-5), var(--mantine-color-${COLORS[i % COLORS.length]}-8))`;

  return (
    <>
      <div className={classes.track} role="img" aria-label="時間配分">
        {segments
          .map((s, i) => ({ ...s, i }))
          .filter((s) => s.sec > 0)
          .map((s) => (
            <Tooltip key={s.id} label={`${s.label} ・ ${formatDuration(s.sec)}`} withArrow>
              <button
                type="button"
                className={classes.segment}
                style={{
                  width: `${(s.sec / scale) * 100}%`,
                  background: color(s.i),
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
      {planned && (
        <div className={classes.planTrack} role="img" aria-label="時間配分の計画">
          {rows
            .map((r, i) => ({ ...r, i }))
            .filter((r) => (r.targetSec ?? 0) > 0)
            .map((r) => (
              <Tooltip
                key={r.id}
                label={`計画: ${r.label} ・ ${formatDuration(r.targetSec ?? 0)}`}
                withArrow
              >
                <button
                  type="button"
                  className={classes.planSegment}
                  style={{
                    left: `${(planStart(rows, r.i) / scale) * 100}%`,
                    width: `${((r.targetSec ?? 0) / scale) * 100}%`,
                    background: color(r.i),
                  }}
                  onClick={() => usePlanModal.setState({ opened: true })}
                  aria-label={`計画 ${r.label} ${formatDuration(r.targetSec ?? 0)}`}
                />
              </Tooltip>
            ))}
        </div>
      )}
    </>
  );
}
