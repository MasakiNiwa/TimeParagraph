import { ActionIcon, Alert, Group, Select, Slider, Stack, Text, Tooltip } from '@mantine/core';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconPlayerStopFilled,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { useSettings, useSettingsStore } from '@/features/settings/settingsStore';
import {
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
import { usePracticeItems } from './usePracticeItems';
import classes from './ControlDock.module.css';

export function SpeechPanel() {
  const { doc, estimate } = usePracticeItems();
  const { status, currentId } = useSpeechStore();
  const { voiceURI, rate } = useSettings().speech;
  const update = useSettingsStore((s) => s.update);
  const voices = useVoices();
  useWakeLock(status === 'playing');

  // ページを離れたら読み上げを止める
  useEffect(() => stop, []);

  if (!speechSupported) {
    return (
      <Alert color="orange">お使いのブラウザは読み上げ(Web Speech API)に対応していません。</Alert>
    );
  }
  if (!doc) return null;

  const blocks = doc.blocks;
  const toggle = () => {
    if (status === 'playing') pause();
    else if (status === 'paused') resume();
    else speakFrom(blocks);
  };

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        段落を押すと、そこから読み上げます。
      </Text>
      <Prompter
        blocks={blocks}
        estimate={estimate}
        state={{ currentId }}
        onSelect={(id) => speakFrom(blocks, id)}
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
                onClick={stop}
                disabled={status === 'idle'}
                aria-label="停止"
              >
                <IconPlayerStopFilled size={22} />
              </ActionIcon>
            </Tooltip>
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
