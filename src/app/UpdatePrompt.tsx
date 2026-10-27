import { Button, Group, Notification, Portal } from '@mantine/core';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** 新しいバージョンが公開されたら、再読み込みを促す */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (e) => console.warn('Service Worker の登録に失敗しました', e),
  });

  if (!needRefresh) return null;
  return (
    <Portal>
      <Notification
        title="新しいバージョンがあります"
        onClose={() => setNeedRefresh(false)}
        style={{
          position: 'fixed',
          left: 16,
          right: 16,
          bottom:
            'calc(var(--app-shell-footer-offset, 0rem) + env(safe-area-inset-bottom, 0px) + 16px)',
          zIndex: 2000,
          maxWidth: 420,
          marginInline: 'auto',
        }}
      >
        <Group justify="flex-end" mt="xs">
          <Button size="xs" onClick={() => void updateServiceWorker(true)}>
            更新する
          </Button>
        </Group>
      </Notification>
    </Portal>
  );
}
