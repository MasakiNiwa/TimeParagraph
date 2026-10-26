import { notifications } from '@mantine/notifications';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useApiKeyStore } from './apiKeys';
import { aiProviders, type AiProviderId } from './providers';

/** API から取得したモデル一覧。設定ページと AI ページで共有し、次回以降も使えるよう保存する */
interface ModelListState {
  lists: Partial<Record<AiProviderId, string[]>>;
  loading: Partial<Record<AiProviderId, boolean>>;
}

export const useModelListStore = create<ModelListState>()(
  persist(() => ({ lists: {}, loading: {} }), {
    name: 'timeparagraph:ai-models',
    version: 1,
    partialize: (s) => ({ lists: s.lists }),
  }),
);

/** モデル一覧を取得する。失敗したときは通知して空のまま */
export async function fetchModelList(provider: AiProviderId, { silent = false } = {}) {
  const key = useApiKeyStore.getState().keys[provider];
  if (!key) return;
  const set = (loading: boolean) =>
    useModelListStore.setState((s) => ({ loading: { ...s.loading, [provider]: loading } }));
  set(true);
  try {
    const list = await aiProviders[provider].listModels(key);
    useModelListStore.setState((s) => ({ lists: { ...s.lists, [provider]: list } }));
    if (!silent) notifications.show({ message: `${list.length} 件のモデルを取得しました` });
  } catch (e) {
    notifications.show({
      color: 'red',
      message: `モデル一覧を取得できませんでした: ${e instanceof Error ? e.message : e}`,
    });
  } finally {
    set(false);
  }
}

/** 選択肢(取得した一覧 + おすすめ + 現在の値)。現在の値が一覧になくても選択状態を保つ */
export function modelOptions(
  provider: AiProviderId,
  lists: ModelListState['lists'],
  current: string,
) {
  return [
    ...new Set([...(lists[provider] ?? []), ...aiProviders[provider].suggestedModels, current]),
  ].filter(Boolean);
}
