import {
  ActionIcon,
  Group,
  NumberInput,
  Popover,
  Slider,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowBackUp, IconArrowForwardUp, IconClearAll } from '@tabler/icons-react';
import { formatDuration } from '@/domain/format';
import { useSettings, useSettingsStore } from '@/features/settings/settingsStore';
import { redo, undo, useHistory } from '../documentStore';
import { useEstimate } from '../useEstimate';
import classes from './SummaryBar.module.css';

function SpeedPopover() {
  const cpm = useSettings().estimation.charsPerMinute;
  const update = useSettingsStore((s) => s.update);
  const set = (v: number) => update({ estimation: { charsPerMinute: v } });
  return (
    <Popover position="bottom" withArrow shadow="md" width={260}>
      <Popover.Target>
        <UnstyledButton className={classes.stat} aria-label="話す速さを変更">
          <Text size="xs" c="dimmed">
            話す速さ
          </Text>
          <Text size="sm" fw={600} className={classes.num}>
            {cpm}
            <Text span size="xs" c="dimmed">
              字/分
            </Text>
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            話す速さ
          </Text>
          <Slider min={150} max={500} step={10} value={cpm} onChange={set} />
          <NumberInput
            min={50}
            max={1000}
            suffix=" 字/分"
            value={cpm}
            onChange={(v) => typeof v === 'number' && set(v)}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export function SummaryBar({ onClear }: { onClear: () => void }) {
  const { estimate } = useEstimate();
  const canUndo = useHistory((s) => s.pastStates.length > 0);
  const canRedo = useHistory((s) => s.futureStates.length > 0);

  return (
    <div className={classes.bar}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap="md" wrap="nowrap">
          <div className={classes.stat}>
            <Text size="xs" c="dimmed">
              合計
            </Text>
            <Text fw={700} className={classes.total} aria-live="polite">
              {formatDuration(estimate.totalSec)}
            </Text>
          </div>
          <div className={classes.stat}>
            <Text size="xs" c="dimmed">
              段落
            </Text>
            <Text size="sm" fw={600} className={classes.num}>
              {estimate.paragraphCount}
            </Text>
          </div>
          <div className={classes.stat} data-hide-xs>
            <Text size="xs" c="dimmed">
              文字
            </Text>
            <Text size="sm" fw={600} className={classes.num}>
              {estimate.totalUnits.toLocaleString()}
            </Text>
          </div>
          <SpeedPopover />
        </Group>
        <Group gap={2} wrap="nowrap">
          <Tooltip label="元に戻す (Ctrl+Z)">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              disabled={!canUndo}
              onClick={undo}
              aria-label="元に戻す"
            >
              <IconArrowBackUp size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="やり直す (Ctrl+Shift+Z)">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              disabled={!canRedo}
              onClick={redo}
              aria-label="やり直す"
            >
              <IconArrowForwardUp size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="クリア">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={onClear}
              aria-label="クリア"
            >
              <IconClearAll size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </div>
  );
}
