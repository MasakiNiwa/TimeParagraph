import {
  Button,
  Group,
  Modal,
  NumberInput,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import type { Block } from '@/domain/document';
import { useSettings } from '@/features/settings/settingsStore';
import { useDocumentStore } from '../documentStore';

const SPEED_MARKS = [
  { value: 0.8, label: 'ゆっくり' },
  { value: 1, label: '標準' },
  { value: 1.2, label: '速め' },
];

export function BlockSettingsModal({
  block,
  opened,
  onClose,
}: {
  block: Block;
  opened: boolean;
  onClose: () => void;
}) {
  const defaultPause = useSettings().estimation.paragraphPauseSec;
  const [speed, setSpeed] = useState(block.speedFactor);
  const [customPause, setCustomPause] = useState(block.pauseAfterSec !== null);
  const [pause, setPause] = useState(block.pauseAfterSec ?? defaultPause);
  const [note, setNote] = useState(block.note);

  useEffect(() => {
    if (!opened) return;
    setSpeed(block.speedFactor);
    setCustomPause(block.pauseAfterSec !== null);
    setPause(block.pauseAfterSec ?? defaultPause);
    setNote(block.note);
  }, [opened, block, defaultPause]);

  const save = () => {
    useDocumentStore.getState().updateBlock(block.id, {
      speedFactor: speed,
      pauseAfterSec: customPause ? pause : null,
      note,
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="パラグラフの設定" centered>
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={500}>
            話す速さ(×{speed.toFixed(2)})
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            強調したい部分はゆっくり、補足は速めに、など
          </Text>
          <Slider
            min={0.6}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={setSpeed}
            marks={SPEED_MARKS}
            label={(v) => `×${v.toFixed(2)}`}
            mb="lg"
          />
        </div>
        <Stack gap="xs">
          <Switch
            label="このパラグラフの後の間を個別に指定する"
            checked={customPause}
            onChange={(e) => setCustomPause(e.currentTarget.checked)}
          />
          <NumberInput
            disabled={!customPause}
            min={0}
            max={600}
            step={0.5}
            decimalScale={1}
            suffix=" 秒"
            value={pause}
            onChange={(v) => typeof v === 'number' && setPause(v)}
            maw={160}
          />
        </Stack>
        <Textarea
          label="メモ"
          description="話さない補足(推定時間には含めません)"
          autosize
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save}>保存</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
