import { createDocument, parseDocument, type TPDocument } from '@/domain/document';
import { db } from '@/lib/db';
import { useDocumentStore } from './documentStore';

const CURRENT_KEY = 'timeparagraph:current-document';
const SAVE_DELAY_MS = 400;

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
    // 保存できない環境でも動作は継続する
  }
}

export async function listDocuments(): Promise<TPDocument[]> {
  return db.documents.orderBy('updatedAt').reverse().toArray();
}

export async function saveDocument(doc: TPDocument) {
  await db.documents.put(doc);
}

/** 文書を開いてエディタに読み込む */
export async function openDocument(id: string) {
  await flushSave();
  const doc = parseDocument(await db.documents.get(id));
  if (!doc) return;
  setCurrentId(doc.id);
  useDocumentStore.getState().load(doc);
}

export async function createAndOpenDocument(partial?: Partial<Omit<TPDocument, 'id'>>) {
  await flushSave();
  const doc = createDocument(partial);
  await saveDocument(doc);
  setCurrentId(doc.id);
  useDocumentStore.getState().load(doc);
}

export async function deleteDocument(id: string) {
  await db.documents.delete(id);
  if (useDocumentStore.getState().doc?.id === id) {
    const [latest] = await listDocuments();
    if (latest) await openDocument(latest.id);
    else await createAndOpenDocument();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: TPDocument | null = null;

async function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const doc = pending;
  pending = null;
  if (doc) await saveDocument(doc);
}

let started = false;

/** 起動時に前回の文書を読み込み、以降の変更を自動保存する */
export async function startPersistence() {
  if (started) return;
  started = true;

  const currentId = getCurrentId();
  const doc =
    (currentId && parseDocument(await db.documents.get(currentId))) ||
    parseDocument((await listDocuments())[0]);
  if (doc) {
    setCurrentId(doc.id);
    useDocumentStore.getState().load(doc);
  } else {
    await createAndOpenDocument();
  }

  useDocumentStore.subscribe((state, prev) => {
    if (!state.doc || state.doc === prev.doc) return;
    // 別の文書へ切り替えた直後は保存不要(読み込んだだけ)
    if (prev.doc && prev.doc.id !== state.doc.id) return;
    pending = state.doc;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flushSave(), SAVE_DELAY_MS);
  });

  window.addEventListener('pagehide', () => void flushSave());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSave();
  });
}
