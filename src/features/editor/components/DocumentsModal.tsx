import { ActionIcon, Button, Group, Modal, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { isSpoken } from '@/domain/estimate';
import { useDocumentStore } from '../documentStore';
import { createAndOpenDocument, deleteDocument, listDocuments, openDocument } from '../persistence';
import classes from './DocumentsModal.module.css';

export function DocumentsModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const docs = useLiveQuery(listDocuments, []);
  const currentId = useDocumentStore((s) => s.doc?.id);

  return (
    <Modal opened={opened} onClose={onClose} title="原稿の一覧" centered size="md">
      <Stack gap="sm">
        <Button
          leftSection={<IconPlus size={16} />}
          variant="light"
          onClick={async () => {
            await createAndOpenDocument();
            onClose();
          }}
        >
          新しい原稿
        </Button>
        {docs?.map((d) => (
          <Group key={d.id} wrap="nowrap" gap="xs" className={classes.row}>
            <UnstyledButton
              flex={1}
              className={classes.open}
              data-current={d.id === currentId || undefined}
              onClick={async () => {
                await openDocument(d.id);
                onClose();
              }}
            >
              <Text fw={500} truncate>
                {d.title || '無題の原稿'}
              </Text>
              <Text size="xs" c="dimmed">
                {d.blocks.filter(isSpoken).length} 段落 ・ 更新{' '}
                {new Date(d.updatedAt).toLocaleString('ja-JP')}
              </Text>
            </UnstyledButton>
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label="削除"
              onClick={() => {
                if (window.confirm(`「${d.title || '無題の原稿'}」を削除しますか?`))
                  void deleteDocument(d.id);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
    </Modal>
  );
}
