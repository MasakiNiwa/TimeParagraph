import { Button, Card, CloseButton, Group, Stack, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { calibrateSpeed, type Rehearsal } from '@/domain/rehearsal';
import { formatDuration } from '@/domain/format';
import { speedLimits } from '@/features/settings/settingsSchema';
import { useSettingsStore } from '@/features/settings/settingsStore';

function diffText(actual: number, est: number) {
  // 表示している秒(四捨五入後)どうしの差にして、見た目と食い違わないようにする
  const d = Math.round(actual) - Math.round(est);
  return `${d >= 0 ? '+' : '−'}${formatDuration(Math.abs(d))}`;
}

export function RehearsalResult({
  result,
  onClose,
  onDiscard,
}: {
  result: Rehearsal;
  onClose: () => void;
  /** 記録を削除する(失敗した計測を残さない) */
  onDiscard?: () => void;
}) {
  const update = useSettingsStore((s) => s.update);
  const speed = calibrateSpeed(result.laps);
  const isChars = result.method === 'chars';
  const isSpeech = result.source === 'speech';
  const unit = isChars ? '字/分' : '拍/分';
  const [minSpeed, maxSpeed] = isChars ? speedLimits.chars : speedLimits.moras;
  const canApplySpeed = speed !== null && speed >= minSpeed && speed <= maxSpeed;

  const applySpeed = () => {
    if (!canApplySpeed || speed === null) return;
    update({ estimation: isChars ? { charsPerMinute: speed } : { morasPerMinute: speed } });
    notifications.show({ message: `話す速さを ${speed} ${unit} に設定しました` });
  };

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600}>
            {isSpeech ? '読み上げ計測の結果' : 'リハーサル結果'}
            {!result.completed && '(途中まで)'}
          </Text>
          <CloseButton onClick={onClose} aria-label="閉じる" />
        </Group>
        <Group gap="xl">
          <div>
            <Text size="xs" c="dimmed">
              実測
            </Text>
            <Text fw={700} size="xl">
              {formatDuration(result.totalSec)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              推定
            </Text>
            <Text fw={600} size="lg">
              {formatDuration(result.estimatedTotalSec)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              差
            </Text>
            <Text fw={600} size="lg">
              {diffText(result.totalSec, result.estimatedTotalSec)}
            </Text>
          </div>
        </Group>
        {speed !== null ? (
          <Group gap="sm" justify="space-between">
            <Text size="sm">
              {isSpeech
                ? `読み上げ(×${(result.speechRate ?? 1).toFixed(1)})の速さ:`
                : 'あなたの話す速さ:'}
              <b>{speed}</b> {unit}(設定 {result.unitsPerMinute} {unit})
            </Text>
            <Button size="xs" variant="light" onClick={applySpeed} disabled={!canApplySpeed}>
              この速さを設定に反映
            </Button>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            計測時間が短いため、話す速さは計算していません。
          </Text>
        )}
        {speed !== null && !canApplySpeed && (
          <Text size="xs" c="dimmed">
            設定できる速さは {minSpeed}〜{maxSpeed} {unit} です。計測内容を確認してください。
          </Text>
        )}
        <Table.ScrollContainer minWidth={360}>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>段落</Table.Th>
                <Table.Th ta="right">推定</Table.Th>
                <Table.Th ta="right">実測</Table.Th>
                <Table.Th ta="right">差</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {result.laps.map((l, i) => (
                <Table.Tr key={`${l.blockId}-${i}`}>
                  <Table.Td>{i + 1}</Table.Td>
                  <Table.Td maw={220}>
                    <Text size="sm" truncate>
                      {l.excerpt}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">{formatDuration(l.estimatedSec)}</Table.Td>
                  <Table.Td ta="right">{formatDuration(l.actualSec)}</Table.Td>
                  <Table.Td ta="right">{diffText(l.actualSec, l.estimatedSec)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {onDiscard && (
          <Group justify="flex-end">
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={onDiscard}
            >
              この記録を破棄
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
