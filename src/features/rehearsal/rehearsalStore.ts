import { create } from 'zustand';
import { newId } from '@/domain/document';
import type { Lap, Rehearsal } from '@/domain/rehearsal';
import { db } from '@/lib/db';

/** リハーサル対象の段落(開始時点のスナップショット) */
export interface RehearsalItem {
  blockId: string;
  excerpt: string;
  estimatedSec: number;
  pauseSec: number;
  weightedUnits: number;
}

export type RehearsalStatus = 'idle' | 'running' | 'paused' | 'finished';

interface RehearsalState {
  status: RehearsalStatus;
  items: RehearsalItem[];
  index: number;
  /** 完了した段落の実測(秒) */
  laps: number[];
  /** 現在の段落の、一時停止前までの経過(ms) */
  segmentAccumMs: number;
  /** 現在の段落の計測を再開した時刻(performance.now) */
  segmentResumedAt: number | null;
  /** 終了後の結果 */
  result: Rehearsal | null;
  meta: { docId: string; docTitle: string; method: string; unitsPerMinute: number } | null;
  startedAt: number;
}

const initial = {
  status: 'idle' as RehearsalStatus,
  items: [],
  index: 0,
  laps: [],
  segmentAccumMs: 0,
  segmentResumedAt: null,
  result: null,
  meta: null,
  startedAt: 0,
};

export const useRehearsalStore = create<RehearsalState>(() => ({ ...initial }));

const now = () => performance.now();

/** 現在の段落の経過秒 */
export function currentSegmentSec(s: RehearsalState, at = now()): number {
  const running = s.segmentResumedAt !== null ? at - s.segmentResumedAt : 0;
  return (s.segmentAccumMs + running) / 1000;
}

export function elapsedTotalSec(s: RehearsalState, at = now()): number {
  return s.laps.reduce((a, b) => a + b, 0) + currentSegmentSec(s, at);
}

export function startRehearsal(items: RehearsalItem[], meta: NonNullable<RehearsalState['meta']>) {
  if (items.length === 0) return;
  useRehearsalStore.setState({
    ...initial,
    status: 'running',
    items,
    meta,
    startedAt: Date.now(),
    segmentResumedAt: now(),
  });
}

export function pauseRehearsal() {
  const s = useRehearsalStore.getState();
  if (s.status !== 'running') return;
  useRehearsalStore.setState({
    status: 'paused',
    segmentAccumMs: currentSegmentSec(s) * 1000,
    segmentResumedAt: null,
  });
}

export function resumeRehearsal() {
  if (useRehearsalStore.getState().status !== 'paused') return;
  useRehearsalStore.setState({ status: 'running', segmentResumedAt: now() });
}

/** 次の段落へ進む(最後の段落なら終了) */
export function nextParagraph() {
  const s = useRehearsalStore.getState();
  if (s.status !== 'running' && s.status !== 'paused') return;
  const laps = [...s.laps, currentSegmentSec(s)];
  if (laps.length >= s.items.length) {
    void finish(laps, true);
    return;
  }
  useRehearsalStore.setState({
    laps,
    index: s.index + 1,
    segmentAccumMs: 0,
    segmentResumedAt: s.status === 'running' ? now() : null,
  });
}

/** 途中で終了する(現在の段落も計測に含める) */
export function finishRehearsal() {
  const s = useRehearsalStore.getState();
  if (s.status !== 'running' && s.status !== 'paused') return;
  const cur = currentSegmentSec(s);
  void finish(cur > 0.5 ? [...s.laps, cur] : s.laps, false);
}

export function resetRehearsal() {
  useRehearsalStore.setState({ ...initial });
}

async function finish(lapSecs: number[], completed: boolean) {
  const s = useRehearsalStore.getState();
  const laps: Lap[] = lapSecs.map((actualSec, i) => ({ ...s.items[i], actualSec }));
  const result: Rehearsal = {
    id: newId(),
    docId: s.meta?.docId ?? '',
    docTitle: s.meta?.docTitle ?? '',
    startedAt: s.startedAt,
    method: s.meta?.method ?? '',
    unitsPerMinute: s.meta?.unitsPerMinute ?? 0,
    laps,
    totalSec: lapSecs.reduce((a, b) => a + b, 0),
    estimatedTotalSec: laps.reduce((a, l) => a + l.estimatedSec, 0),
    completed,
  };
  useRehearsalStore.setState({
    status: 'finished',
    laps: lapSecs,
    segmentAccumMs: 0,
    segmentResumedAt: null,
    result,
  });
  if (laps.length > 0) await db.rehearsals.put(result);
}

export async function listRehearsals(docId: string): Promise<Rehearsal[]> {
  const all = await db.rehearsals.where('docId').equals(docId).sortBy('startedAt');
  return all.reverse();
}

export async function deleteRehearsal(id: string) {
  await db.rehearsals.delete(id);
}
