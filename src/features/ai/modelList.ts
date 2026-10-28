import { notifications } from '@mantine/notifications';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useApiKeyStore } from './apiKeys';
import { fetchOpenRouterModels, type OpenRouterModel } from './openrouterModels';
import { aiProviders, type AiProviderId } from './providers';

/** API から取得したモデル一覧。設定ページと AI ページで共有し、次回以降も使えるよう保存する */
interface ModelListState {
  lists: Partial<Record<AiProviderId, string[]>>;
  loading: Partial<Record<AiProviderId, boolean>>;
  /** OpenRouter のモデル一覧(料金・ツール対応などの情報つき) */
  openrouterModels: OpenRouterModel[];
  openrouterFetchedAt: number;
  /** ★ で固定したモデル(OpenRouter) */
  favorites: string[];
  /** 最近使ったモデル(新しい順) */
  recents: string[];
}

export const useModelListStore = create<ModelListState>()(
  persist(
    (): ModelListState => ({
      lists: {},
      loading: {},
      openrouterModels: [],
      openrouterFetchedAt: 0,
      favorites: [],
      recents: [],
    }),
    {
      name: 'timeparagraph:ai-models',
      version: 1,
      partialize: (s) => ({
        lists: s.lists,
        openrouterModels: s.openrouterModels,
        openrouterFetchedAt: s.openrouterFetchedAt,
        favorites: s.favorites,
        recents: s.recents,
      }),
    },
  ),
);

/** OpenRouter のモデル一覧を取得する(キー不要)。古い一覧は 1 日で取り直す */
export async function fetchOpenRouterModelList({ force = false, silent = false } = {}) {
  const s = useModelListStore.getState();
  if (s.loading.openrouter) return;
  if (!force && s.openrouterModels.length && Date.now() - s.openrouterFetchedAt < 86_400_000)
    return;
  useModelListStore.setState((st) => ({ loading: { ...st.loading, openrouter: true } }));
  try {
    const models = await fetchOpenRouterModels();
    useModelListStore.setState({ openrouterModels: models, openrouterFetchedAt: Date.now() });
    if (!silent) notifications.show({ message: `${models.length} 件のモデルを取得しました` });
  } catch (e) {
    notifications.show({
      color: 'red',
      message: `OpenRouter のモデル一覧を取得できませんでした: ${e instanceof Error ? e.message : e}`,
    });
  } finally {
    useModelListStore.setState((st) => ({ loading: { ...st.loading, openrouter: false } }));
  }
}

export function toggleFavorite(id: string) {
  useModelListStore.setState((s) => ({
    favorites: s.favorites.includes(id)
      ? s.favorites.filter((f) => f !== id)
      : [...s.favorites, id],
  }));
}

/** 使ったモデルを「最近使った」の先頭に入れる(最大 5 件) */
export function addRecent(id: string) {
  if (!id) return;
  useModelListStore.setState((s) => ({
    recents: [id, ...s.recents.filter((r) => r !== id)].slice(0, 5),
  }));
}

/** モデル一覧を取得する。失敗したときは通知して空のまま */
export async function fetchModelList(provider: AiProviderId, { silent = false } = {}) {
  if (provider === 'openrouter') return fetchOpenRouterModelList({ force: true, silent });
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
