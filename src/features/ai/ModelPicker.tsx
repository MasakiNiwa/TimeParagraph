import { ActionIcon, Group, Select, TextInput, Tooltip } from '@mantine/core';
import { IconList, IconPencil, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useSettings, useSettingsStore } from '@/features/settings/settingsStore';
import { useApiKeyStore } from './apiKeys';
import { fetchModelList, modelOptions, useModelListStore } from './modelList';
import { aiProviders } from './providers';

/**
 * モデルの選択欄。一覧から選ぶ(検索可)か、モデル名を直接入力する。
 * 設定ページと AI ページの両方で使う。
 */
export function ModelPicker({
  label,
  description,
  size = 'sm',
}: {
  label?: string;
  description?: string;
  size?: 'xs' | 'sm';
}) {
  const settings = useSettings();
  const update = useSettingsStore((s) => s.update);
  const provider = aiProviders[settings.ai.provider];
  const model = settings.ai[provider.modelSetting];
  const hasKey = useApiKeyStore((s) => Boolean(s.keys[provider.id]));
  const lists = useModelListStore((s) => s.lists);
  const loading = useModelListStore((s) => Boolean(s.loading[provider.id]));
  const [manual, setManual] = useState(false);
  const setModel = (v: string) => update({ ai: { [provider.modelSetting]: v } });
  const fetched = lists[provider.id]?.length ?? 0;

  return (
    <Group align="flex-end" wrap="nowrap" gap={4}>
      {manual ? (
        <TextInput
          flex={1}
          size={size}
          label={label}
          description={description}
          value={model}
          onChange={(e) => setModel(e.currentTarget.value)}
          placeholder="モデル名"
          aria-label="モデル名"
        />
      ) : (
        <Select
          flex={1}
          size={size}
          label={label}
          description={description}
          data={modelOptions(provider.id, lists, model)}
          value={model}
          onChange={(v) => v && setModel(v)}
          searchable
          allowDeselect={false}
          nothingFoundMessage="見つかりません"
          maxDropdownHeight={320}
          comboboxProps={{ withinPortal: true }}
          aria-label="モデル"
          onDropdownOpen={() => {
            // 一覧が未取得なら、開いたときに自動で取得する
            if (hasKey && fetched === 0 && !loading)
              void fetchModelList(provider.id, { silent: true });
          }}
        />
      )}
      <Tooltip label={manual ? '一覧から選ぶ' : 'モデル名を直接入力'}>
        <ActionIcon
          variant="default"
          size={size === 'xs' ? 30 : 36}
          onClick={() => setManual((m) => !m)}
          aria-label={manual ? '一覧から選ぶ' : 'モデル名を直接入力'}
        >
          {manual ? <IconList size={16} /> : <IconPencil size={16} />}
        </ActionIcon>
      </Tooltip>
      <Tooltip label={hasKey ? 'モデル一覧を API から取得' : 'API キーを設定すると取得できます'}>
        <ActionIcon
          variant="default"
          size={size === 'xs' ? 30 : 36}
          onClick={() => void fetchModelList(provider.id)}
          loading={loading}
          disabled={!hasKey}
          aria-label="モデル一覧を取得"
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
