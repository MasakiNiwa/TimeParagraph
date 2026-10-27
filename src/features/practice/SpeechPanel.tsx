import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Select,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconPlayerStopFilled,
  IconStopwatch,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { Rehearsal } from '@/domain/rehearsal';
import { useEstimator } from '@/features/estimation/useEstimator';
import {
  buildRehearsal,
  deleteRehearsal,
  saveRehearsal,
} from '@/features/rehearsal/rehearsalStore';
import { useSettings, useSettingsStore } from '@/features/settings/settingsStore';
import {
  cancelMeasure,
  measureBySpeech,
  pause,
  resume,
  skip,
  speakFrom,
  speechSupported,
  stop,
  useSpeechStore,
} from '@/features/speech/speechStore';
import { useVoices } from '@/features/speech/useVoices';
import { useWakeLock } from '@/lib/useWakeLock';
import { Prompter } from './Prompter';
import { RehearsalResult } from './RehearsalResult';
import { usePracticeItems } from './usePracticeItems';
import classes from './ControlDock.module.css';

export function SpeechPanel() {
  const { doc, estimate, items } = usePracticeItems();
  const { method, unitsPerMinute } = useEstimator();
  const { status, currentId, measuring } = useSpeechStore();
  const [result, setResult] = useState<Rehearsal | null>(null);
  const { voiceURI, rate } = useSettings().speech;
  const update = useSettingsStore((s) => s.update);
  const voices = useVoices();
  useWakeLock(status === 'playing');

  // ページを離れたら読み上げを止める(計測中なら記録せずに取りやめる)
  useEffect(
    () => () => {
      cancelMeasure();
      stop();
    },
    [],
  );

  if (!speechSupported) {
    return (
      <Alert color="orange">お使いのブラウザは読み上げ(Web Speech API)に対応していません。</Alert>
    );
  }
  if (!doc) return null;

  const blocks = doc.blocks;
  const startMeasure = () => {
    setResult(null);
    const startedAt = Date.now();
    const pauses = new Map(items.map((i) => [i.blockId, i.pauseSec]));
    measureBySpeech(blocks, pauses, (laps, completed) => {
      if (laps.length === 0) {
        notifications.show({ message: '読み上げの計測を中止しました(記録は保存していません)' });
        return;
      }
      const r = buildRehearsal(
        items,
        laps,
        { docId: doc.id, docTitle: doc.title, method, unitsPerMinute },
        { startedAt, completed, source: 'speech', speechRate: rate },
      );
      void saveRehearsal(r);
      setResult(r);
    });
  };

  const toggle = () => {
    if (status === 'playing') pause();
    else if (status === 'paused') resume();
    else speakFrom(blocks);
  };

  return (
    <Stack gap="xs">
      {result && (
        <RehearsalResult
          result={result}
          onClose={() => setResult(null)}
          onDiscard={() => {
            void deleteRehearsal(result.id);
            setResult(null);
          }}
        />
      )}
      <Text size="sm" c="dimmed">
        段落を押すと、そこから読み上げます。「読み上げで計測」では最初から読み上げて段落ごとの時間を計測し、リハーサル履歴に保存します。
      </Text>
      <Prompter
        blocks={blocks}
        estimate={estimate}
        state={{ currentId }}
        onSelect={measuring ? undefined : (id) => speakFrom(blocks, id)}
      />
      <div className={classes.dock}>
        <Stack gap={8}>
          <Group justify="center" gap="sm" wrap="nowrap">
            <Tooltip label="前の段落">
              <ActionIcon
                variant="subtle"
                size="xl"
                onClick={() => skip(-1)}
                disabled={status === 'idle'}
                aria-label="前の段落"
              >
                <IconPlayerSkipBackFilled size={22} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              size={56}
              radius="xl"
              onClick={toggle}
              aria-label={status === 'playing' ? '一時停止' : '読み上げ'}
            >
              {status === 'playing' ? (
                <IconPlayerPauseFilled size={28} />
              ) : (
                <IconPlayerPlayFilled size={28} />
              )}
            </ActionIcon>
            <Tooltip label="次の段落">
              <ActionIcon
                variant="subtle"
                size="xl"
                onClick={() => skip(1)}
                disabled={status === 'idle'}
                aria-label="次の段落"
              >
                <IconPlayerSkipForwardFilled size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="停止">
              <ActionIcon
                variant="subtle"
                size="xl"
                onClick={() => stop()}
                disabled={status === 'idle'}
                aria-label="停止"
              >
                <IconPlayerStopFilled size={22} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group justify="center">
            {measuring ? (
              <Badge size="lg" variant="light" tt="none" leftSection={<IconStopwatch size={14} />}>
                読み上げで計測中(前後へ移動すると計測を中止します)
              </Badge>
            ) : (
              <Button
                size="xs"
                variant="light"
                leftSection={<IconStopwatch size={16} />}
                onClick={startMeasure}
                disabled={items.length === 0}
              >
                読み上げで計測
              </Button>
            )}
          </Group>
          <Group gap="sm" wrap="nowrap" align="center">
            <Select
              flex={1}
              size="xs"
              placeholder="既定の声"
              data={voices.map((v) => ({ value: v.voiceURI, label: v.name }))}
              value={voiceURI || null}
              onChange={(v) => update({ speech: { voiceURI: v ?? '' } })}
              clearable
              aria-label="声"
              comboboxProps={{ withinPortal: true }}
            />
            <Text size="xs" c="dimmed" w={52} ta="right" className={classes.small}>
              ×{rate.toFixed(1)}
            </Text>
            <Slider
              w={120}
              min={0.5}
              max={2}
              step={0.1}
              value={rate}
              onChange={(v) => update({ speech: { rate: v } })}
              label={null}
              aria-label="読み上げ速度"
            />
          </Group>
        </Stack>
      </div>
    </Stack>
  );
}
