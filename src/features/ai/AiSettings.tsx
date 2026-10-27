import {
  Anchor,
  Button,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useApiKeyStore } from './apiKeys';
import type { Settings } from '@/features/settings/settingsSchema';
import { ModelPicker } from './ModelPicker';
import { effortLabels } from './effort';
import { aiProviders, type AiProviderId } from './providers';

export function AiSettings() {
  const { settings, update } = useSettingsStore();
  const { keys, setKey, clearAll } = useApiKeyStore();
  const provider = aiProviders[settings.ai.provider];
  const key = keys[provider.id] ?? '';

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
      <ModelPicker
        label="モデル"
        description="一覧から選ぶ(入力して絞り込み)か、鉛筆ボタンでモデル名を直接入力します。🔄 で最新の一覧を取得します。"
      />
      <div>
        <Text size="sm" fw={500}>
          考える深さ
        </Text>
        <Text size="xs" c="dimmed" mb={6}>
          深く考えるほど丁寧になりますが、応答に時間がかかります(flash
          系でも数分かかることがあります)。普段は「速さ優先」がおすすめです。
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.ai.effort}
          onChange={(v) => update({ ai: { effort: v as Settings['ai']['effort'] } })}
          data={Object.entries(effortLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <Switch
        label="AI の思考過程を表示する"
        description="対応しているモデルでは、考えている内容をリアルタイムに表示します"
        checked={settings.ai.showThinking}
        onChange={(e) => update({ ai: { showThinking: e.currentTarget.checked } })}
      />
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
