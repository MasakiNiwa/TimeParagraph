import { create } from 'zustand';

/** 画面表示だけの状態(原稿には保存しない) */
interface EditorUiState {
  /** たたんでいる見出し */
  collapsed: string[];
  /** ドラッグ中の見出し(配下の段落を一時的に隠す) */
  draggingHeading: string | null;
}

export const useEditorUiStore = create<EditorUiState>(() => ({
  collapsed: [],
  draggingHeading: null,
}));

export function toggleCollapsed(headingId: string) {
  useEditorUiStore.setState((s) => ({
    collapsed: s.collapsed.includes(headingId)
      ? s.collapsed.filter((id) => id !== headingId)
      : [...s.collapsed, headingId],
  }));
}

export function setAllCollapsed(headingIds: string[]) {
  useEditorUiStore.setState({ collapsed: headingIds });
}
