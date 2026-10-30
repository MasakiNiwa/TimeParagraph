import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 画面表示だけの状態(原稿には保存しない) */
interface EditorUiState {
  /** たたんでいる見出し(次に開いたときも同じ状態になるよう、このブラウザに保存する) */
  collapsed: string[];
  /** ドラッグ中の見出し(配下の段落を一時的に隠す) */
  draggingHeading: string | null;
  /** 「このセクションだけ表示」している見出し */
  hoisted: string | null;
  /** 全文表示、または要点(タイトル・最初の文)だけのアウトライン表示 */
  view: 'full' | 'outline';
}

/** 保存しておく、たたんだ見出しの数の上限(古いものから捨てる) */
const MAX_COLLAPSED = 500;

export const useEditorUiStore = create<EditorUiState>()(
  persist(
    () => ({
      collapsed: [] as string[],
      draggingHeading: null as string | null,
      hoisted: null as string | null,
      view: 'full' as 'full' | 'outline',
    }),
    {
      name: 'timeparagraph:editor-ui',
      version: 1,
      partialize: (s) => ({ collapsed: s.collapsed, view: s.view }),
      merge: (persisted, current) => {
        const p = persisted as { collapsed?: unknown; view?: unknown } | undefined;
        const c = p?.collapsed;
        return {
          ...current,
          view: p?.view === 'outline' ? 'outline' : 'full',
          collapsed: Array.isArray(c) ? c.filter((x): x is string => typeof x === 'string') : [],
        };
      },
    },
  ),
);

export function toggleCollapsed(headingId: string) {
  useEditorUiStore.setState((s) => ({
    collapsed: s.collapsed.includes(headingId)
      ? s.collapsed.filter((id) => id !== headingId)
      : [...s.collapsed, headingId].slice(-MAX_COLLAPSED),
  }));
}

/** 指定した見出しをたたむ(ほかの原稿の見出しのたたみ状態は残す) */
export function setAllCollapsed(allHeadingIds: string[], collapse: boolean) {
  useEditorUiStore.setState((s) => {
    const rest = s.collapsed.filter((id) => !allHeadingIds.includes(id));
    return { collapsed: collapse ? [...rest, ...allHeadingIds].slice(-MAX_COLLAPSED) : rest };
  });
}

/** 全文表示と、要点だけのアウトライン表示を切り替える */
export function setView(view: 'full' | 'outline') {
  useEditorUiStore.setState({ view });
}

export function setHoisted(headingId: string | null) {
  useEditorUiStore.setState({ hoisted: headingId });
}

/** 「時間配分を計画」ダイアログ(配分バーや分析ページからも開く) */
export const usePlanModal = create<{ opened: boolean }>(() => ({ opened: false }));
