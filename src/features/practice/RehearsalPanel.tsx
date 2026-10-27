import { Alert, Button, Group, Menu, Progress, Stack, Text } from '@mantine/core';
import {
  IconPlayerPlayFilled,
  IconPlayerTrackNextFilled,
  IconPresentation,
  IconFlag,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDuration } from '@/domain/format';
import { useEstimator } from '@/features/estimation/useEstimator';
import {
  currentSegmentSec,
  discardResult,
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
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]:not([aria-label="発表者モード"])',
        )
      )
        return;
      // フォーカス中のボタンはスペースキーで自身が押されるので、ここでは横取りしない
      if (e.key === ' ' && target?.closest('button, [role="button"]')) return;
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextParagraph();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
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
  useEffect(() => () => pauseRehearsal(), []);
  useEffect(() => {
    if (!state.meta) return;
    if (state.meta.docId !== doc?.id) resetRehearsal();
    else if (active && state.meta.blocks && state.meta.blocks !== doc?.blocks) {
      resetRehearsal();
      notifications.show({
        message: '原稿が変更されたため、計測を取りやめました。新しい内容で開始してください。',
      });
    }
  }, [doc?.id, doc?.blocks, state.meta, active]);

  const actualById = useMemo(
    () => new Map(state.laps.map((sec, i) => [state.items[i]?.blockId, sec])),
    [state.laps, state.items],
  );

  if (!doc) return null;
  if (items.length === 0) {
    return <Alert color="gray">エディタで原稿を入力すると、リハーサルができます。</Alert>;
  }

  const start = () =>
    startRehearsal(items, {
      docId: doc.id,
      docTitle: doc.title,
      method,
      unitsPerMinute,
      blocks: doc.blocks,
    });

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
        <RehearsalResult
          result={state.result}
          onClose={resetRehearsal}
          onDiscard={() => void discardResult()}
        />
      )}
      {state.status === 'idle' && (
        <Text size="sm" c="dimmed">
          「開始」を押したら自分で声に出して話し、段落を話し終えるたびに「次の段落へ」を押します(強調中の段落をタップ、またはスペースキー
          / → でも進めます)。段落ごとの実際の時間を計測し、自分の話す速さを求めます。
        </Text>
      )}
      <Prompter
        blocks={doc.blocks}
        estimate={estimate}
        state={{
          currentId: current?.blockId ?? null,
          actualById: state.status === 'idle' ? undefined : actualById,
          currentHint: active ? 'タップで次の段落へ' : undefined,
        }}
        onSelect={
          active
            ? (id) => {
                if (id === current?.blockId) nextParagraph();
              }
            : undefined
        }
      />
      <div className={classes.dock}>
        {!active ? (
          <Group justify="space-between" wrap="wrap">
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
            <Button
              fullWidth
              size="lg"
              leftSection={<IconPlayerTrackNextFilled size={20} />}
              onClick={nextParagraph}
            >
              {state.index + 1 >= state.items.length ? '終了して結果を見る' : '次の段落へ'}
            </Button>
            <Group gap="xs" wrap="nowrap" grow>
              <Button
                size="xs"
                variant="default"
                onClick={state.status === 'running' ? pauseRehearsal : resumeRehearsal}
              >
                {state.status === 'running' ? '一時停止' : '再開'}
              </Button>
              <Button size="xs" variant="default" onClick={() => setPresenter(true)}>
                発表モード
              </Button>
              <Menu position="top-end" shadow="md" withinPortal>
                <Menu.Target>
                  <Button size="xs" variant="default">
                    終了・破棄
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconFlag size={16} />} onClick={finishRehearsal}>
                    ここまでで終了して保存
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={resetRehearsal}
                  >
                    破棄する(保存しない)
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Stack>
        )}
      </div>
      <RehearsalHistory docId={doc.id} />
      {presenter && active && <PresenterView onClose={closePresenter} />}
    </Stack>
  );
}
