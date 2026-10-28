import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateSchema, type Template } from '@/domain/templates';

/** 自分で保存した構成テンプレート(本文は含まない)。このブラウザに保存する */
interface TemplateState {
  templates: Template[];
  add: (t: Template) => void;
  remove: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: [],
      add: (t) => set((s) => ({ templates: [...s.templates, t] })),
      remove: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
    }),
    {
      name: 'timeparagraph:templates',
      version: 1,
      // 壊れたテンプレートは読み込まない
      merge: (persisted, current) => ({
        ...current,
        templates: ((persisted as { templates?: unknown[] } | undefined)?.templates ?? []).flatMap(
          (t) => {
            const r = TemplateSchema.safeParse(t);
            return r.success ? [r.data] : [];
          },
        ),
      }),
    },
  ),
);
