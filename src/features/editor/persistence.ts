import { notifications } from '@mantine/notifications';
import { create } from 'zustand';
import { createDocument, parseDocument, type TPDocument } from '@/domain/document';
import { db } from '@/lib/db';
import { useDocumentStore } from './documentStore';

const CURRENT_KEY = 'timeparagraph:current-document';
const SAVE_DELAY_MS = 400;

export const usePersistenceStore = create<{
  status: 'loading' | 'saving' | 'saved' | 'error';
  error: string | null;
}>(() => ({ status: 'loading', error: null }));

// 読み込んだ保存版を覚え、別タブの更新・削除を古い原稿で上書きしない
const savedVersions = new Map<string, string>();

function getCurrentId(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

function setCurrentId(id: string) {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // IndexedDB での原稿保存は継続する
  }
}

/** ボタンからの非同期操作の失敗を、未処理の例外にせず画面で知らせる */
export async function runDocumentAction(action: () => Promise<void>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    console.error('原稿の操作に失敗しました', error);
    notifications.show({
      color: 'red',
      message:
        '原稿の保存・読み込みに失敗しました。再度お試しください。入力内容は JSON で書き出せます。',
    });
    return false;
  }
}

export async function listDocuments(): Promise<TPDocument[]> {
  return db.documents.orderBy('updatedAt').reverse().toArray();
}

export async function saveDocument(doc: TPDocument) {
  await db.transaction('rw', db.documents, async () => {
    const expected = savedVersions.get(doc.id);
    if (expected !== undefined) {
      const current = await db.documents.get(doc.id);
      if (JSON.stringify(current) !== expected)
        throw new Error(
          '別のタブでこの原稿が更新・削除されました。JSON を書き出してから、ページを再読み込みしてください。',
        );
    }
    await db.documents.put(doc);
  });
  savedVersions.set(doc.id, JSON.stringify(doc));
}

/** 文書を開いてエディタに読み込む */
export async function openDocument(id: string) {
  await flushSave();
  const stored = await db.documents.get(id);
  const doc = parseDocument(stored);
  if (!doc) throw new Error('原稿が存在しないか、データが壊れています');
  savedVersions.set(doc.id, JSON.stringify(stored));
  setCurrentId(doc.id);
  useDocumentStore.getState().load(doc);
}

export async function createAndOpenDocument(partial?: Partial<Omit<TPDocument, 'id'>>) {
  await importAndOpenDocument(createDocument(partial));
}

/** 取り込んだ原稿を保存して開く */
export async function importAndOpenDocument(doc: TPDocument) {
  await flushSave();
  await saveDocument(doc);
  setCurrentId(doc.id);
  useDocumentStore.getState().load(doc);
}

export async function deleteDocument(id: string) {
  // 削除より前に保存待ち・保存中の書き込みを終える(削除後の復活を防ぐ)
  await flushSave();
  await db.transaction('rw', db.documents, db.rehearsals, async () => {
    const expected = savedVersions.get(id);
    if (expected !== undefined && JSON.stringify(await db.documents.get(id)) !== expected)
      throw new Error('別のタブで原稿が変更されています。再読み込みしてから削除してください。');
    await db.documents.delete(id);
    await db.rehearsals.where('docId').equals(id).delete();
  });
  savedVersions.delete(id);
  if (useDocumentStore.getState().doc?.id === id) {
    const [latest] = await listDocuments();
    if (latest) await openDocument(latest.id);
    else await createAndOpenDocument();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: TPDocument | null = null;
let saving: Promise<void> | null = null;

/** 書き込みを直列化し、保存中に入った変更も保存する。失敗時は最新の内容を保持する */
export function flushSave(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  if (saving) return saving;
  saving = (async () => {
    while (pending) {
      const doc = pending;
      pending = null;
      usePersistenceStore.setState({ status: 'saving' });
      try {
        await saveDocument(doc);
      } catch (error) {
        pending ??= doc;
        usePersistenceStore.setState({
          status: 'error',
          error: error instanceof Error ? error.message : '保存に失敗しました',
        });
        throw error;
      }
    }
    usePersistenceStore.setState({ status: 'saved', error: null });
  })().finally(() => {
    saving = null;
  });
  return saving;
}

const autoSave = () => void flushSave().catch(() => {});
let startup: Promise<void> | null = null;

/** 保存不可でも入力・書き出しは使えるようにし、保存失敗は常に画面へ表示する */
export function startPersistence(): Promise<void> {
  startup ??= (async () => {
    let doc: TPDocument | null = null;
    try {
      const currentId = getCurrentId();
      let stored = currentId ? await db.documents.get(currentId) : undefined;
      doc = parseDocument(stored);
      if (!doc) {
        stored = (await listDocuments())[0];
        doc = parseDocument(stored);
      }
      if (doc) savedVersions.set(doc.id, JSON.stringify(stored));
      if (!doc) {
        doc = createDocument();
        await saveDocument(doc);
      }
      setCurrentId(doc.id);
      useDocumentStore.getState().load(doc);
      usePersistenceStore.setState({ status: 'saved', error: null });
    } catch (error) {
      console.error('自動保存を開始できませんでした', error);
      doc ??= createDocument();
      useDocumentStore.getState().load(doc);
      pending = doc;
      usePersistenceStore.setState({
        status: 'error',
        error: error instanceof Error ? error.message : '保存に失敗しました',
      });
    }

    useDocumentStore.subscribe((state, prev) => {
      if (!state.doc || state.doc === prev.doc) return;
      if (prev.doc && prev.doc.id !== state.doc.id) return;
      pending = state.doc;
      usePersistenceStore.setState({ status: 'saving' });
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(autoSave, SAVE_DELAY_MS);
    });

    window.addEventListener('pagehide', autoSave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') autoSave();
    });
  })();
  return startup;
}
