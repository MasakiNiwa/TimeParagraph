import { ActionIcon, Group, Portal, Progress, Text, Tooltip } from '@mantine/core';
import {
  IconMaximize,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackPrevFilled,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
import { useFocusTrap } from '@mantine/hooks';
import { formatDuration } from '@/domain/format';
import { paceDrift, paceText } from '@/domain/pace';
import { useDocumentStore } from '@/features/editor/documentStore';
import {
  currentSegmentSec,
  elapsedTotalSec,
  nextParagraph,
  pauseRehearsal,
  plannedOf,
  previousParagraph,
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
  const blockOf = (id?: string) => blocks.find((b) => b.id === id);
  const textOf = (id?: string) => blockOf(id)?.text ?? '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previousParagraph();
      }
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
  // ペースは計画(なければ目標ペース、推定)を基準にする
  const basis = state.meta?.paceBasis ?? 'estimate';
  const plannedTotal = state.items.reduce((a, i) => a + plannedOf(i), 0);
  const drift = paceDrift(state.items.map(plannedOf), state.index, seg, total);
  const segPlanned = plannedOf(current);
  const ratio = seg / Math.max(segPlanned, 0.1);
  const title = blockOf(current.blockId)?.title.trim();
  const nextTitle = blockOf(next?.blockId)?.title.trim();

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
                / {formatDuration(plannedTotal)}
              </Text>
            </Text>
            <Text className={classes.sub} data-over={drift > 5 || undefined}>
              {paceText(drift, basis)} ・ 段落 {state.index + 1}/{state.items.length} ・ この段落{' '}
              {formatDuration(seg)} / {formatDuration(segPlanned)}
            </Text>
          </div>
          <Group gap={4} wrap="nowrap">
            <Tooltip label="前の段落へ(←)">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={previousParagraph}
                disabled={state.index === 0}
                aria-label="前の段落へ"
              >
                <IconPlayerTrackPrevFilled size={20} />
              </ActionIcon>
            </Tooltip>
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
          {title && <Text className={classes.title}>{title}</Text>}
          <Text className={classes.current}>{textOf(current.blockId)}</Text>
          {next && (
            <Text className={classes.next}>
              次:{nextTitle ? `【${nextTitle}】` : ''}
              {textOf(next.blockId)}
            </Text>
          )}
          <Text className={classes.hint}>
            画面をタップ / スペースキーで次へ ・ ← で前へ
            {state.status === 'paused' && '(一時停止中)'}
          </Text>
        </div>
      </div>
    </Portal>
  );
}
