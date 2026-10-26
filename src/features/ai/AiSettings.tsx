import {
  Anchor,
  Autocomplete,
  Button,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useApiKeyStore } from './apiKeys';
import { aiProviders, type AiProviderId } from './providers';

export function AiSettings() {
  const { settings, update } = useSettingsStore();
  const { keys, setKey, clearAll } = useApiKeyStore();
  const provider = aiProviders[settings.ai.provider];
  const model = settings.ai[provider.modelSetting];
  const [models, setModels] = useState<Partial<Record<AiProviderId, string[]>>>({});
  const [loading, setLoading] = useState(false);
  const key = keys[provider.id] ?? '';

  const fetchModels = async () => {
    setLoading(true);
    try {
      const list = await provider.listModels(key);
      setModels((m) => ({ ...m, [provider.id]: list }));
      notifications.show({ message: `${list.length} 件のモデルを取得しました` });
    } catch (e) {
      notifications.show({
        color: 'red',
        message: `モデル一覧を取得できませんでした: ${e instanceof Error ? e.message : e}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const options = [...new Set([...(models[provider.id] ?? []), ...provider.suggestedModels])];

  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        AI は任意の機能です。設定しなくてもアプリのすべての機能を使えます。
      </Text>
      <div>
        <Text size="sm" fw={500} mb={4}>
          AI サービス
        </Text>
        <SegmentedControl
          fullWidth
          value={provider.id}
          onChange={(v) => update({ ai: { provider: v as AiProviderId } })}
          data={Object.values(aiProviders).map((p) => ({
            value: p.id,
            label: p.label.split(' ').pop()!,
          }))}
        />
      </div>
      <PasswordInput
        label={`${provider.label} の API キー`}
        description={
          <>
            {provider.keyHint}{' '}
            <Anchor href={provider.keyUrl} target="_blank" rel="noopener noreferrer" size="xs">
              キーを取得
            </Anchor>
          </>
        }
        placeholder="未設定"
        value={key}
        onChange={(e) => setKey(provider.id, e.currentTarget.value)}
        autoComplete="off"
      />
      <Group align="flex-end" wrap="nowrap" gap="xs">
        <Autocomplete
          flex={1}
          label="モデル"
          description="一覧から選ぶか、モデル名を直接入力します"
          data={options}
          value={model}
          onChange={(v) => update({ ai: { [provider.modelSetting]: v } })}
          maxDropdownHeight={280}
        />
        <Button
          variant="default"
          leftSection={<IconRefresh size={16} />}
          onClick={fetchModels}
          loading={loading}
          disabled={!key}
        >
          一覧を取得
        </Button>
      </Group>
      <Stack gap={4}>
        <Text size="xs" c="dimmed">
          ・API キーはこのブラウザ内(localStorage)にのみ保存され、選んだ AI
          サービスへ直接送信されます。
        </Text>
        <Text size="xs" c="dimmed">
          ・AI を使うと、原稿の内容が AI
          サービスに送信されます。機密情報を含む原稿ではご注意ください。
        </Text>
        <Text size="xs" c="dimmed">
          ・共用の端末では、使い終わったらキーを削除してください。
        </Text>
      </Stack>
      <Group>
        <Button
          variant="light"
          color="red"
          size="xs"
          onClick={() => {
            if (window.confirm('保存されているすべての API キーを削除しますか?')) clearAll();
          }}
        >
          すべての API キーを削除
        </Button>
      </Group>
    </Stack>
  );
}
