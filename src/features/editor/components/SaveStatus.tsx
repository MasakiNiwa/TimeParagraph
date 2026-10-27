import { Alert, Button, Group, Text } from '@mantine/core';
import { flushSave, runDocumentAction, usePersistenceStore } from '../persistence';

export function SaveStatus() {
  const { status, error } = usePersistenceStore();
  if (status === 'error') {
    return (
      <Alert color="red" title="原稿を保存できていません" role="alert">
        <Group gap="xs">
          <Text size="sm">
            {error?.startsWith('別のタブ')
              ? error
              : '入力内容はこの画面に残っています。再試行するか、原稿メニューから JSON を書き出してください。'}
          </Text>
          <Button
            size="xs"
            variant="light"
            color="red"
            onClick={() => void runDocumentAction(flushSave)}
          >
            保存を再試行
          </Button>
        </Group>
      </Alert>
    );
  }
  return (
    <Text size="xs" c="dimmed" role="status">
      {status === 'saved' ? 'このブラウザに自動保存済み' : '保存中…'}
    </Text>
  );
}
