import { Alert, Button, Group, Progress, Stack, Text } from '@mantine/core';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconPlayerTrackNextFilled,
  IconPresentation,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDuration } from '@/domain/format';
import { useEstimator } from '@/features/estimation/useEstimator';
import {
  currentSegmentSec,
  elapsedTotalSec,
  finishRehearsal,
  nextParagraph,
  pauseRehearsal,
  resetRehearsal,
  resumeRehearsal,
  startRehearsal,
  useRehearsalStore,
} from '@/features/rehearsal/rehearsalStore';
import { useWakeLock } from '@/lib/useWakeLock';
import { PresenterView } from './PresenterView';
import { Prompter } from './Prompter';
import { RehearsalHistory } from './RehearsalHistory';
import { RehearsalResult } from './RehearsalResult';
import { usePracticeItems } from './usePracticeItems';
import classes from './ControlDock.module.css';

/** 計測中は 0.2 秒ごとに再描画する */
function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [active]);
}

function useRehearsalKeys(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextParagraph();
      } else if (e.key.toLowerCase() === 'p') {
        const s = useRehearsalStore.getState().status;
        if (s === 'running') pauseRehearsal();
        else resumeRehearsal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

export function RehearsalPanel() {
  const { doc, estimate, items } = usePracticeItems();
  const { method, unitsPerMinute } = useEstimator();
  const state = useRehearsalStore();
  const active = state.status === 'running' || state.status === 'paused';
  const [presenter, setPresenter] = useState(false);
  const closePresenter = useCallback(() => setPresenter(false), []);
  useTicker(state.status === 'running');
  useRehearsalKeys(active);
  useWakeLock(active);

  const actualById = useMemo(
    () => new Map(state.laps.map((sec, i) => [state.items[i]?.blockId, sec])),
    [state.laps, state.items],
  );

  if (!doc) return null;
  if (items.length === 0) {
    return <Alert color="gray">エディタで原稿を入力すると、リハーサルができます。</Alert>;
  }

  const start = () =>
    startRehearsal(items, { docId: doc.id, docTitle: doc.title, method, unitsPerMinute });

  const current = active ? state.items[state.index] : undefined;
  const segSec = currentSegmentSec(state);
  const totalSec = elapsedTotalSec(state);
  const estTotal = (active ? state.items : items).reduce((a, i) => a + i.estimatedSec, 0);
  const segRatio = current ? segSec / Math.max(current.estimatedSec, 0.1) : 0;
  // ここまでに使ってよい時間(推定ベース)との差
  const plannedSoFar =
    state.items.slice(0, state.index).reduce((a, i) => a + i.estimatedSec, 0) +
    Math.min(segSec, current?.estimatedSec ?? 0);
  const drift = totalSec - plannedSoFar;

  return (
    <Stack gap="xs">
      {state.status === 'finished' && state.result && (
        <RehearsalResult result={state.result} onClose={resetRehearsal} />
      )}
      {state.status === 'idle' && (
        <Text size="sm" c="dimmed">
          自分で声に出して話し、段落を話し終えるたびに「次へ」(スペースキー / →)を押します。
          段落ごとの実際の時間を計測し、自分の話す速さを求めます。
        </Text>
      )}
      <Prompter
        blocks={doc.blocks}
        estimate={estimate}
        state={{
          currentId: current?.blockId ?? null,
          actualById: state.status === 'idle' ? undefined : actualById,
        }}
      />
      <div className={classes.dock}>
        {!active ? (
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text size="xs" c="dimmed">
                推定
              </Text>
              <Text className={classes.timer}>{formatDuration(estTotal)}</Text>
            </div>
            <Group gap="xs" wrap="nowrap">
              <Button
                size="md"
                variant="default"
                leftSection={<IconPresentation size={18} />}
                onClick={() => {
                  start();
                  setPresenter(true);
                }}
              >
                発表モード
              </Button>
              <Button size="md" leftSection={<IconPlayerPlayFilled size={18} />} onClick={start}>
                {state.status === 'finished' ? 'もう一度' : '開始'}
              </Button>
            </Group>
          </Group>
        ) : (
          <Stack gap={8}>
            <Group justify="space-between" wrap="nowrap" align="flex-end">
              <div>
                <Text size="xs" c="dimmed">
                  経過 / 推定
                </Text>
                <Text className={classes.timer} aria-live="off">
                  {formatDuration(totalSec)}
                  <Text span size="sm" c="dimmed" fw={500}>
                    {' '}
                    / {formatDuration(estTotal)}
                  </Text>
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text size="xs" c="dimmed">
                  段落 {state.index + 1} / {state.items.length}
                </Text>
                <Text size="sm" fw={600} className={classes.small}>
                  {drift >= 0 ? '+' : '−'}
                  {formatDuration(Math.abs(drift))}
                  <Text span size="xs" c="dimmed" fw={400}>
                    {drift >= 0 ? ' 遅れ' : ' 先行'}
                  </Text>
                </Text>
              </div>
            </Group>
            <Progress
              value={Math.min(segRatio, 1) * 100}
              color={segRatio > 1.1 ? 'orange' : 'calm'}
              size="sm"
              aria-label="この段落の経過"
            />
            <Text size="xs" c="dimmed" className={classes.small}>
              この段落 {formatDuration(segSec)} / 推定 {formatDuration(current?.estimatedSec ?? 0)}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Button
                flex={1}
                size="md"
                leftSection={<IconPlayerTrackNextFilled size={18} />}
                onClick={nextParagraph}
              >
                {state.index + 1 >= state.items.length ? '終了' : '次へ'}
              </Button>
              <Button
                size="md"
                variant="default"
                onClick={state.status === 'running' ? pauseRehearsal : resumeRehearsal}
                aria-label={state.status === 'running' ? '一時停止' : '再開'}
              >
                {state.status === 'running' ? (
                  <IconPlayerPauseFilled size={18} />
                ) : (
                  <IconPlayerPlayFilled size={18} />
                )}
              </Button>
              <Button
                size="md"
                variant="default"
                onClick={() => setPresenter(true)}
                aria-label="発表モード"
              >
                <IconPresentation size={18} />
              </Button>
              <Button size="md" variant="default" onClick={finishRehearsal} aria-label="ここで終了">
                <IconPlayerStopFilled size={18} />
              </Button>
            </Group>
          </Stack>
        )}
      </div>
      <RehearsalHistory docId={doc.id} />
      {presenter && active && <PresenterView onClose={closePresenter} />}
    </Stack>
  );
}
