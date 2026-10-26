import { Accordion, ActionIcon, Group, Stack, Text } from '@mantine/core';
import { IconHistory, IconTrash } from '@tabler/icons-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatDuration } from '@/domain/format';
import { deleteRehearsal, listRehearsals } from '@/features/rehearsal/rehearsalStore';

export function RehearsalHistory({ docId }: { docId: string }) {
  const history = useLiveQuery(() => listRehearsals(docId), [docId]);
  if (!history?.length) return null;

  return (
    <Accordion variant="separated" mt="md" defaultValue={null}>
      <Accordion.Item value="history">
        <Accordion.Control icon={<IconHistory size={18} />}>
          リハーサル履歴({history.length})
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap={6}>
            {history.map((r) => (
              <Group key={r.id} justify="space-between" wrap="nowrap">
                <div>
                  <Text size="sm">
                    {new Date(r.startedAt).toLocaleString('ja-JP')}
                    {!r.completed && (
                      <Text span size="xs" c="dimmed">
                        {' '}
                        (途中まで)
                      </Text>
                    )}
                  </Text>
                  <Text size="xs" c="dimmed">
                    実測 {formatDuration(r.totalSec)} / 推定 {formatDuration(r.estimatedTotalSec)}・{' '}
                    {r.laps.length} 段落
                  </Text>
                </div>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="履歴を削除"
                  onClick={() => void deleteRehearsal(r.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
