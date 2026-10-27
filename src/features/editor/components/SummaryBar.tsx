import {
  ActionIcon,
  Button,
  Group,
  Loader,
  NumberInput,
  Popover,
  Slider,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowBackUp, IconArrowForwardUp, IconClearAll } from '@tabler/icons-react';
import { useState } from 'react';
import { formatDuration } from '@/domain/format';
import { methodInfo } from '@/features/estimation/useEstimator';
import { useMorphStore } from '@/features/estimation/morphStore';
import { SpeedNumberInput } from '@/features/settings/SpeedNumberInput';
import { useSettings, useSettingsStore } from '@/features/settings/settingsStore';
import { redo, undo, useDocumentStore, useHistory } from '../documentStore';
import { useEstimate } from '../useEstimate';
import { AllocationBar } from './AllocationBar';
import classes from './SummaryBar.module.css';

function SpeedPopover() {
  const { method, charsPerMinute, morasPerMinute } = useSettings().estimation;
  const update = useSettingsStore((s) => s.update);
  const isChars = method === 'chars';
  const value = isChars ? charsPerMinute : morasPerMinute;
  const unit = isChars ? '字/分' : '拍/分';
  const [min, max] = isChars ? [150, 500] : [250, 700];
  const set = (v: number) =>
    update({ estimation: isChars ? { charsPerMinute: v } : { morasPerMinute: v } });

  return (
    <Popover position="bottom" withArrow shadow="md" width={260}>
      <Popover.Target>
        <UnstyledButton className={classes.stat} aria-label="話す速さを変更">
          <Text size="xs" c="dimmed">
            話す速さ
          </Text>
          <Text size="sm" fw={600} className={classes.num}>
            {value}
            <Text span size="xs" c="dimmed">
              {unit}
            </Text>
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            話す速さ
          </Text>
          <Text size="xs" c="dimmed">
            推定方式: {methodInfo[method].label}(設定で変更できます)
          </Text>
          <Slider min={min} max={max} step={10} value={value} onChange={set} />
          <SpeedNumberInput value={value} onChange={set} isChars={isChars} />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

const PRESET_MINUTES = [3, 5, 10, 15, 20, 30, 45, 60];

function TargetPopover() {
  const target = useDocumentStore((s) => s.doc?.targetDurationSec ?? null);
  const [opened, setOpened] = useState(false);
  const [min, setMin] = useState(0);
  const [sec, setSec] = useState(0);

  const open = () => {
    const t = target ?? 0;
    setMin(Math.floor(t / 60));
    setSec(Math.round(t % 60));
    setOpened(true);
  };
  const apply = (value: number | null) => {
    useDocumentStore.getState().setTarget(value);
    setOpened(false);
  };
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom"
      withArrow
      shadow="md"
      width={280}
    >
      <Popover.Target>
        <UnstyledButton className={classes.stat} onClick={open} aria-label="目標時間を設定">
          <Text size="xs" c="dimmed">
            目標
          </Text>
          {target === null ? (
            <Text size="sm" c="dimmed">
              未設定
            </Text>
          ) : (
            <Text size="sm" fw={600} className={classes.num}>
              {formatDuration(target)}
            </Text>
          )}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            目標時間
          </Text>
          <Group gap={6}>
            {PRESET_MINUTES.map((m) => (
              <Button key={m} size="compact-xs" variant="light" onClick={() => apply(m * 60)}>
                {m}分
              </Button>
            ))}
          </Group>
          <Group gap="xs" wrap="nowrap">
            <NumberInput
              min={0}
              max={600}
              suffix=" 分"
              value={min}
              onChange={(v) => typeof v === 'number' && setMin(v)}
            />
            <NumberInput
              min={0}
              max={59}
              suffix=" 秒"
              value={sec}
              onChange={(v) => typeof v === 'number' && setSec(v)}
            />
          </Group>
          <Group justify="space-between">
            <Button variant="subtle" color="gray" size="xs" onClick={() => apply(null)}>
              目標を外す
            </Button>
            <Button size="xs" onClick={() => apply(min * 60 + sec)}>
              設定
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function DiffBadge({ totalSec }: { totalSec: number }) {
  const target = useDocumentStore((s) => s.doc?.targetDurationSec ?? null);
  if (target === null) return null;
  const diff = totalSec - target;
  const over = diff > 0.5;
  return (
    <div className={classes.stat}>
      <Text size="xs" c="dimmed">
        {over ? '超過' : '残り'}
      </Text>
      <Text size="sm" fw={600} className={classes.num} data-over={over || undefined} data-diff>
        {over ? '+' : ''}
        {formatDuration(Math.abs(diff))}
      </Text>
    </div>
  );
}

function MorphStatus() {
  const method = useSettings().estimation.method;
  const status = useMorphStore((s) => s.status);
  if (method !== 'morph') return null;
  if (status === 'loading')
    return (
      <Tooltip label="辞書を読み込んで解析しています(それまでは簡易推定)">
        <Loader size={14} />
      </Tooltip>
    );
  if (status === 'error')
    return (
      <Tooltip label="形態素解析を利用できません。簡易推定で計算しています">
        <Text size="xs" c="orange">
          簡易
        </Text>
      </Tooltip>
    );
  return null;
}

export function SummaryBar({ onClear }: { onClear: () => void }) {
  const { estimate, unitLabel } = useEstimate();
  const canUndo = useHistory((s) => s.pastStates.length > 0);
  const canRedo = useHistory((s) => s.futureStates.length > 0);

  return (
    <div className={classes.bar}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap="md" wrap="nowrap" className={classes.stats}>
          <div className={classes.stat}>
            <Text size="xs" c="dimmed">
              合計
            </Text>
            <Group gap={6} wrap="nowrap" align="center">
              <Text fw={700} className={classes.total} aria-live="polite">
                {formatDuration(estimate.totalSec)}
              </Text>
              <MorphStatus />
            </Group>
          </div>
          <TargetPopover />
          <DiffBadge totalSec={estimate.totalSec} />
          <div className={classes.stat} data-hide-xs>
            <Text size="xs" c="dimmed">
              段落
            </Text>
            <Text size="sm" fw={600} className={classes.num}>
              {estimate.paragraphCount}
            </Text>
          </div>
          <div className={classes.stat} data-hide-sm>
            <Text size="xs" c="dimmed">
              {unitLabel === '字' ? '文字' : '拍'}
            </Text>
            <Text size="sm" fw={600} className={classes.num}>
              {Math.round(estimate.totalUnits).toLocaleString()}
            </Text>
          </div>
          <div data-hide-xs>
            <SpeedPopover />
          </div>
        </Group>
        <Group gap={0} wrap="nowrap">
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
      <AllocationBar />
    </div>
  );
}
