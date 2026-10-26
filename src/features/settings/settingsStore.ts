import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultSettings, parseSettings, type Settings } from './settingsSchema';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

interface SettingsState {
  settings: Settings;
  update: (patch: DeepPartial<Settings>) => void;
  reset: () => void;
}

function mergeDeep<T>(base: T, patch: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const cur = out[k];
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object'
        ? mergeDeep(cur, v as DeepPartial<typeof cur>)
        : v;
  }
  return out as T;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      update: (patch) => set((s) => ({ settings: parseSettings(mergeDeep(s.settings, patch)) })),
      reset: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'timeparagraph:settings',
      version: 1,
      partialize: (s) => ({ settings: s.settings }),
      merge: (persisted, current) => ({
        ...current,
        settings: parseSettings((persisted as { settings?: unknown } | undefined)?.settings),
      }),
    },
  ),
);

export const useSettings = () => useSettingsStore((s) => s.settings);
