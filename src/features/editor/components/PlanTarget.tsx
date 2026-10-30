import { Button, Group, Popover, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { useId, useState, type ReactNode } from 'react';
import { formatDuration, parseDuration } from '@/domain/format';
import { planStatus, type PlanStatus } from '@/domain/plan';
import { useDocumentStore } from '../documentStore';
import classes from './BlockItem.module.css';

export const PLAN_COLORS: Record<PlanStatus, string> = {
  over: 'orange',
  under: 'blue',
  ok: 'teal',
};

export const PLAN_LABELS: Record<PlanStatus, string> = {
  over: '計画より長い',
  under: '計画より短い',
  ok: '計画どおり',
};

/** 「1:30」「90」「1分30秒」などで時間を入力する欄。読めない入力はエラー表示 */
export function DurationInput({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  'aria-label'?: string;
  w?: number | string;
  size?: 'xs' | 'sm';
  id?: string;
  onEnter?: () => void;
}) {
  const { onEnter, ...props } = rest;
  const invalid = value.trim() !== '' && parseDuration(value) === null;
  return (
    <TextInput
      {...props}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) onEnter?.();
      }}
      placeholder="1:30"
      inputMode="text"
      error={invalid ? '「1:30」「90秒」などで入力' : undefined}
    />
  );
}

/**
 * 見出し(セクション)・段落の計画時間を設定するポップオーバー。
 * children は表示部分(押すと開く)
 */
export function PlanTargetPopover({
  blockId,
  targetSec,
  kind,
  children,
  label,
}: {
  blockId: string;
  targetSec: number | null;
  kind: 'section' | 'paragraph';
  children: ReactNode;
  label: string;
}) {
  const [opened, setOpened] = useState(false);
  const [value, setValue] = useState('');
  const inputId = useId();
  const open = () => {
    setValue(targetSec === null ? '' : formatDuration(targetSec));
    setOpened(true);
  };
  const apply = (sec: number | null) => {
    useDocumentStore.getState().setPlan({ [blockId]: sec });
    setOpened(false);
  };
  const parsed = parseDuration(value);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      // autoFocus だと位置が決まる前にページが先頭へスクロールし、ポップオーバーが隠れるため、
      // スクロールせずにフォーカスする
      onOpen={() =>
        requestAnimationFrame(() =>
          document.getElementById(inputId)?.focus({ preventScroll: true }),
        )
      }
      position="bottom-end"
      withArrow
      shadow="md"
      width={250}
    >
      <Popover.Target>
        <UnstyledButton onClick={open} aria-label={label} className={classes.planButton}>
          {children}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {kind === 'section' ? 'このセクションの計画時間' : 'この段落の計画時間'}
          </Text>
          <DurationInput
            value={value}
            onChange={setValue}
            aria-label="計画時間"
            id={inputId}
            onEnter={() => parsed !== null && apply(parsed)}
          />
          <Text size="xs" c="dimmed">
            全体の配分は「︙ → 時間配分を計画」でまとめて決められます。
          </Text>
          <Group justify="space-between">
            <Button variant="subtle" color="gray" size="xs" onClick={() => apply(null)}>
              計画を外す
            </Button>
            <Button size="xs" disabled={parsed === null} onClick={() => apply(parsed)}>
              設定
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

/** 「0:45 / 1:00」のような、推定と計画の表示 */
export function PlanTimeText({
  actualSec,
  targetSec,
  prefix = '',
}: {
  actualSec: number;
  targetSec: number | null;
  prefix?: string;
}) {
  if (targetSec === null)
    return (
      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
        {prefix}
        {formatDuration(actualSec)}
      </Text>
    );
  const status = planStatus(actualSec, targetSec);
  return (
    <Text
      size="xs"
      style={{ whiteSpace: 'nowrap' }}
      c={`${PLAN_COLORS[status]}.6`}
      title={PLAN_LABELS[status]}
      className={classes.num}
    >
      {prefix}
      {formatDuration(actualSec)} / {formatDuration(targetSec)}
    </Text>
  );
}
