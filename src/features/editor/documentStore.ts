import { temporal } from 'zundo';
import { create, useStore } from 'zustand';
import type { TemporalState } from 'zundo';
import { createBlock, newId, type Block, type TPDocument } from '@/domain/document';

/** フォーカス移動の要求(ブロック追加・分割・結合の後にカーソル位置を指定する) */
export interface FocusRequest {
  id: string;
  caret: number | 'end';
  nonce: number;
}

interface DocumentState {
  doc: TPDocument | null;
  focus: FocusRequest | null;

  load: (doc: TPDocument) => void;
  setTitle: (title: string) => void;
  setTarget: (sec: number | null) => void;
  updateBlock: (id: string, patch: Partial<Omit<Block, 'id'>>) => void;
  insertBlock: (afterId: string | null, block?: Partial<Omit<Block, 'id'>>) => string;
  insertBlocks: (afterId: string | null, blocks: Block[]) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, toIndex: number) => void;
  moveBy: (id: string, delta: number) => void;
  splitBlock: (id: string, offset: number) => void;
  mergeWithPrevious: (id: string) => void;
  duplicateBlock: (id: string) => void;
  clearBlocks: () => void;
  setBlocks: (blocks: Block[]) => void;
  requestFocus: (id: string, caret?: number | 'end') => void;
}

type HistoryState = Pick<DocumentState, 'doc'>;

// テキスト入力は同じブロックへの連続入力を 1 つの履歴にまとめる
let pendingKey: string | null = null;
let lastKey: string | null = null;
let lastTime = 0;
const COALESCE_MS = 1000;

function breakTypingHistory() {
  pendingKey = null;
  lastKey = null;
  lastTime = 0;
}

export const useDocumentStore = create<DocumentState>()(
  temporal(
    (set, get) => {
      const mutate = (fn: (doc: TPDocument) => Partial<TPDocument>) => {
        const doc = get().doc;
        if (!doc) return;
        set({ doc: { ...doc, ...fn(doc), updatedAt: Date.now() } });
      };
      const mapBlocks = (fn: (blocks: Block[]) => Block[]) =>
        mutate((d) => ({ blocks: fn(d.blocks) }));
      const indexOf = (id: string) => get().doc?.blocks.findIndex((b) => b.id === id) ?? -1;
      let nonce = 0;
      const focusOn = (id: string, caret: number | 'end' = 'end') =>
        set({ focus: { id, caret, nonce: ++nonce } });

      return {
        doc: null,
        focus: null,

        load: (doc) => {
          breakTypingHistory();
          set({ doc, focus: null });
          useDocumentStore.temporal.getState().clear();
          breakTypingHistory();
        },
        setTitle: (title) => {
          pendingKey = 'title';
          mutate(() => ({ title }));
        },
        setTarget: (targetDurationSec) => mutate(() => ({ targetDurationSec })),
        updateBlock: (id, patch) => {
          if (Object.keys(patch).length === 1 && 'text' in patch) pendingKey = `text:${id}`;
          mapBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
        },
        insertBlock: (afterId, partial) => {
          const block = createBlock(partial);
          get().insertBlocks(afterId, [block]);
          focusOn(block.id, 0);
          return block.id;
        },
        insertBlocks: (afterId, blocks) =>
          mapBlocks((bs) => {
            const i = afterId === null ? -1 : bs.findIndex((b) => b.id === afterId);
            if (afterId !== null && i < 0) return bs;
            return [...bs.slice(0, i + 1), ...blocks, ...bs.slice(i + 1)];
          }),
        removeBlock: (id) => {
          const i = indexOf(id);
          const blocks = get().doc?.blocks ?? [];
          const neighbor = blocks[i - 1] ?? blocks[i + 1];
          mapBlocks((bs) => {
            const rest = bs.filter((b) => b.id !== id);
            return rest.length ? rest : [createBlock()];
          });
          focusOn(neighbor?.id ?? get().doc!.blocks[0].id);
        },
        moveBlock: (id, toIndex) =>
          mapBlocks((bs) => {
            const from = bs.findIndex((b) => b.id === id);
            if (from < 0 || toIndex < 0 || toIndex >= bs.length || from === toIndex) return bs;
            const next = [...bs];
            const [item] = next.splice(from, 1);
            next.splice(toIndex, 0, item);
            return next;
          }),
        moveBy: (id, delta) => {
          get().moveBlock(id, indexOf(id) + delta);
          focusOn(id);
        },
        splitBlock: (id, offset) => {
          const block = get().doc?.blocks.find((b) => b.id === id);
          if (!block) return;
          const head = block.text.slice(0, offset);
          const tail = block.text.slice(offset);
          const next = createBlock({
            text: tail,
            speedFactor: block.speedFactor,
            pauseAfterSec: block.pauseAfterSec,
          });
          mapBlocks((bs) => bs.flatMap((b) => (b.id === id ? [{ ...b, text: head }, next] : [b])));
          focusOn(next.id, 0);
        },
        mergeWithPrevious: (id) => {
          const i = indexOf(id);
          const blocks = get().doc?.blocks ?? [];
          const prev = blocks[i - 1];
          const cur = blocks[i];
          if (!prev || !cur) return;
          const caret = prev.text.length;
          mapBlocks((bs) =>
            bs
              .filter((b) => b.id !== id)
              .map((b) =>
                b.id === prev.id
                  ? {
                      ...b,
                      text: prev.text + cur.text,
                      note: [prev.note, cur.note].filter(Boolean).join('\n'),
                      pauseAfterSec: cur.pauseAfterSec,
                    }
                  : b,
              ),
          );
          focusOn(prev.id, caret);
        },
        duplicateBlock: (id) => {
          const block = get().doc?.blocks.find((b) => b.id === id);
          if (!block) return;
          get().insertBlocks(id, [{ ...block, id: newId() }]);
        },
        clearBlocks: () => {
          const first = createBlock();
          mutate(() => ({ blocks: [first] }));
          focusOn(first.id);
        },
        setBlocks: (blocks) => mutate(() => ({ blocks: blocks.length ? blocks : [createBlock()] })),
        requestFocus: (id, caret = 'end') => focusOn(id, caret),
      };
    },
    {
      limit: 200,
      partialize: (s): HistoryState => ({ doc: s.doc }),
      equality: (a, b) => a.doc === b.doc,
      handleSet: (handleSet) => (pastState, replace, currentState, deltaState) => {
        const key = pendingKey;
        pendingKey = null;
        const now = Date.now();
        const coalesce = key !== null && key === lastKey && now - lastTime < COALESCE_MS;
        lastKey = key;
        lastTime = now;
        if (coalesce) return;
        (handleSet as unknown as (...a: unknown[]) => void)(
          pastState,
          replace,
          currentState,
          deltaState,
        );
      },
    },
  ),
);

/** 履歴の状態を購読する(selector はプリミティブを返すこと) */
export function useHistory<T>(selector: (s: TemporalState<HistoryState>) => T): T {
  return useStore(useDocumentStore.temporal, selector);
}

export function undo() {
  breakTypingHistory();
  useDocumentStore.temporal.getState().undo();
  breakTypingHistory();
}

export function redo() {
  breakTypingHistory();
  useDocumentStore.temporal.getState().redo();
  breakTypingHistory();
}
