import { ActionIcon, Group, Portal, Progress, Text, Tooltip } from '@mantine/core';
import {
  IconMaximize,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
import { useFocusTrap } from '@mantine/hooks';
import { formatDuration } from '@/domain/format';
import { useDocumentStore } from '@/features/editor/documentStore';
import {
  currentSegmentSec,
  elapsedTotalSec,
  nextParagraph,
  pauseRehearsal,
  resumeRehearsal,
  useRehearsalStore,
} from '@/features/rehearsal/rehearsalStore';
import classes from './PresenterView.module.css';

/** 発表者モード: 現在の段落を大きく表示し、画面のタップで次へ進む */
export function PresenterView({ onClose }: { onClose: () => void }) {
  const state = useRehearsalStore();
  const focusTrapRef = useFocusTrap();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRootRef = useCallback(
    (el: HTMLDivElement | null) => {
      rootRef.current = el;
      focusTrapRef(el);
    },
    [focusTrapRef],
  );
  const blocks = useDocumentStore((s) => s.doc?.blocks ?? []);
  const current = state.items[state.index];
  const next = state.items[state.index + 1];
  const textOf = (id?: string) => blocks.find((b) => b.id === id)?.text ?? '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);

  // 計測が終わったら閉じる
  useEffect(() => {
    if (state.status === 'finished' || state.status === 'idle') onClose();
  }, [state.status, onClose]);

  if (!current) return null;

  const total = elapsedTotalSec(state);
  const seg = currentSegmentSec(state);
  const estTotal = state.items.reduce((a, i) => a + i.estimatedSec, 0);
  const planned =
    state.items.slice(0, state.index).reduce((a, i) => a + i.estimatedSec, 0) +
    Math.min(seg, current.estimatedSec);
  const drift = total - planned;
  const ratio = seg / Math.max(current.estimatedSec, 0.1);

  return (
    <Portal>
      <div
        ref={setRootRef}
        className={classes.root}
        role="dialog"
        aria-modal="true"
        aria-label="発表者モード"
        tabIndex={-1}
      >
        <Group justify="space-between" className={classes.top} wrap="nowrap">
          <div>
            <Text className={classes.clock}>
              {formatDuration(total)}
              <Text span className={classes.sub}>
                {' '}
                / {formatDuration(estTotal)}
              </Text>
            </Text>
            <Text className={classes.sub} data-over={drift > 5 || undefined}>
              {drift >= 0 ? '+' : '−'}
              {formatDuration(Math.abs(drift))} {drift >= 0 ? '遅れ' : '先行'} ・ 段落{' '}
              {state.index + 1}/{state.items.length}
            </Text>
          </div>
          <Group gap={4} wrap="nowrap">
            <Tooltip label="全画面">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={() => void rootRef.current?.requestFullscreen?.().catch(() => {})}
                aria-label="全画面"
              >
                <IconMaximize size={20} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={state.status === 'running' ? pauseRehearsal : resumeRehearsal}
              aria-label={state.status === 'running' ? '一時停止' : '再開'}
            >
              {state.status === 'running' ? (
                <IconPlayerPauseFilled size={20} />
              ) : (
                <IconPlayerPlayFilled size={20} />
              )}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={onClose}
              aria-label="発表者モードを閉じる"
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        </Group>
        <Progress
          value={Math.min(ratio, 1) * 100}
          color={ratio > 1.1 ? 'orange' : 'calm'}
          size="xs"
          radius={0}
        />
        <div
          className={classes.stage}
          role="button"
          tabIndex={0}
          data-autofocus
          aria-label="次の段落へ"
          onClick={nextParagraph}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (!e.repeat) nextParagraph();
            }
          }}
        >
          <Text className={classes.current}>{textOf(current.blockId)}</Text>
          {next && <Text className={classes.next}>次:{textOf(next.blockId)}</Text>}
          <Text className={classes.hint}>
            画面をタップ / スペースキーで次へ{state.status === 'paused' && '(一時停止中)'}
          </Text>
        </div>
      </div>
    </Portal>
  );
}
