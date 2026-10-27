import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument } from '@/domain/document';

const storage = vi.hoisted(() => new Map());
const put = vi.hoisted(() =>
  vi.fn(async (doc) => {
    storage.set(doc.id, doc);
  }),
);
vi.mock('@/lib/db', () => ({
  db: {
    documents: {
      put,
      get: async (id: string) => storage.get(id),
      delete: async (id: string) => {
        storage.delete(id);
      },
      orderBy: () => ({
        reverse: () => ({ toArray: async () => [...storage.values()].reverse() }),
      }),
    },
    rehearsals: { where: () => ({ equals: () => ({ delete: async () => {} }) }) },
    transaction: async (...args: unknown[]) => (args.at(-1) as () => Promise<void>)(),
  },
}));

beforeEach(() => {
  vi.resetModules();
  storage.clear();
  put.mockClear();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('persistence', () => {
  it('入力直後に現在の原稿を削除しても復活しない', async () => {
    const doc = createDocument();
    storage.set(doc.id, doc);
    const persistence = await import('./persistence');
    const { useDocumentStore } = await import('./documentStore');
    await persistence.startPersistence();
    useDocumentStore.getState().setTitle('入力直後');
    await persistence.deleteDocument(doc.id);
    expect(storage.has(doc.id)).toBe(false);
    expect(useDocumentStore.getState().doc?.id).not.toBe(doc.id);
  });
});

it('保存失敗でも最新の入力を保持し、再試行で保存できる', async () => {
  const doc = createDocument();
  storage.set(doc.id, doc);
  const p = await import('./persistence');
  const { useDocumentStore } = await import('./documentStore');
  await p.startPersistence();
  useDocumentStore.getState().setTitle('失いたくない原稿');
  put.mockRejectedValueOnce(new Error('QuotaExceededError'));
  await expect(p.flushSave()).rejects.toThrow('QuotaExceededError');
  expect(p.usePersistenceStore.getState().status).toBe('error');
  expect(useDocumentStore.getState().doc?.title).toBe('失いたくない原稿');
  await p.flushSave();
  expect(storage.get(doc.id).title).toBe('失いたくない原稿');
  expect(p.usePersistenceStore.getState().status).toBe('saved');
});

it('保存中の追加入力を古い書き込みで上書きしない', async () => {
  const doc = createDocument();
  storage.set(doc.id, doc);
  const p = await import('./persistence');
  const { useDocumentStore } = await import('./documentStore');
  await p.startPersistence();
  let complete!: () => void;
  put.mockImplementationOnce(async (snapshot) => {
    await new Promise<void>((resolve) => {
      complete = resolve;
    });
    storage.set(snapshot.id, snapshot);
  });
  useDocumentStore.getState().setTitle('1回目');
  const saving = p.flushSave();
  useDocumentStore.getState().setTitle('2回目');
  await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
  complete();
  await saving;
  expect(storage.get(doc.id).title).toBe('2回目');
});

it('保存不可で起動しても入力とバックアップが使える', async () => {
  put.mockRejectedValueOnce(new Error('保存不可'));
  const p = await import('./persistence');
  const { useDocumentStore } = await import('./documentStore');
  await p.startPersistence();
  expect(useDocumentStore.getState().doc).not.toBeNull();
  expect(p.usePersistenceStore.getState().status).toBe('error');
  useDocumentStore.getState().setTitle('作業を続ける');
  await p.flushSave();
  expect([...storage.values()][0].title).toBe('作業を続ける');
});

it('別タブの更新・削除を古い画面の自動保存で上書きしない', async () => {
  const doc = createDocument();
  storage.set(doc.id, doc);
  const p = await import('./persistence');
  const { useDocumentStore } = await import('./documentStore');
  await p.startPersistence();
  storage.set(doc.id, { ...doc, title: '別タブの最新原稿' });
  useDocumentStore.getState().setTitle('この画面の変更');
  await expect(p.flushSave()).rejects.toThrow('別のタブ');
  expect(storage.get(doc.id).title).toBe('別タブの最新原稿');
  expect(useDocumentStore.getState().doc?.title).toBe('この画面の変更');
  storage.delete(doc.id);
  await expect(p.flushSave()).rejects.toThrow('別のタブ');
  expect(storage.has(doc.id)).toBe(false);
});
