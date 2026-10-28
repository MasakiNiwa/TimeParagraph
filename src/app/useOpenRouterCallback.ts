import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiKeyStore } from '@/features/ai/apiKeys';
import { handleOpenRouterCallback } from '@/features/ai/openrouterAuth';
import { useSettingsStore } from '@/features/settings/settingsStore';

/** 「OpenRouter でログイン」から戻ってきたときに、API キーを受け取って保存する */
export function useOpenRouterCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    void handleOpenRouterCallback().then((r) => {
      if (r.status !== 'none') navigate('/settings');
      if (r.status === 'success') {
        const keys = useApiKeyStore.getState();
        keys.setKey('openrouter', r.key);
        useSettingsStore.getState().update({ ai: { provider: 'openrouter' } });
        notifications.show({
          message: keys.locked
            ? 'OpenRouter にログインしました。パスフレーズでロックを解除すると、キーが保存されます。'
            : 'OpenRouter にログインしました。続けてモデルを選んでください。',
        });
      } else if (r.status === 'error') {
        notifications.show({ color: 'red', message: r.message });
      }
    });
  }, [navigate]);
}
