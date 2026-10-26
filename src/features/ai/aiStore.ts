import type { ModelMessage } from 'ai';
import { create } from 'zustand';
import type { BlockEdit } from '@/domain/edits';

export interface ToolActivity {
  name: string;
  status: 'running' | 'done' | 'error';
}

export interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tools: ToolActivity[];
  proposalIds: string[];
  error?: string;
}

export interface Proposal {
  id: string;
  summary: string;
  edits: BlockEdit[];
  beforeSec: number;
  afterSec: number;
  status: 'pending' | 'applied' | 'dismissed';
}

interface AiState {
  items: ChatItem[];
  /** モデルに送る会話履歴(ツール呼び出しを含む) */
  history: ModelMessage[];
  proposals: Record<string, Proposal>;
  busy: boolean;
  abort: AbortController | null;
}

export const useAiStore = create<AiState>(() => ({
  items: [],
  history: [],
  proposals: {},
  busy: false,
  abort: null,
}));

export function updateItem(id: string, fn: (item: ChatItem) => ChatItem) {
  useAiStore.setState((s) => ({ items: s.items.map((i) => (i.id === id ? fn(i) : i)) }));
}

export function setProposalStatus(id: string, status: Proposal['status']) {
  useAiStore.setState((s) => ({
    proposals: { ...s.proposals, [id]: { ...s.proposals[id], status } },
  }));
}

export function resetChat() {
  useAiStore.getState().abort?.abort();
  useAiStore.setState({ items: [], history: [], proposals: {}, busy: false, abort: null });
}
