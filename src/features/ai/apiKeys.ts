import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AiProviderId } from './providers';

/**
 * API キー。このブラウザの localStorage にだけ保存し、各 AI サービスへ直接送信する。
 * 設定(settings)とは分けて保存し、設定の書き出しなどに含まれないようにしている。
 */
interface ApiKeyState {
  keys: Partial<Record<AiProviderId, string>>;
  setKey: (provider: AiProviderId, key: string) => void;
  clearAll: () => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set) => ({
      keys: {},
      setKey: (provider, key) => set((s) => ({ keys: { ...s.keys, [provider]: key.trim() } })),
      clearAll: () => set({ keys: {} }),
    }),
    { name: 'timeparagraph:ai-keys', version: 1 },
  ),
);
