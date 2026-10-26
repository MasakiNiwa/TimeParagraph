import { beforeEach, describe, expect, it } from 'vitest';
import { createBlock, createDocument } from '@/domain/document';
import { undo, useDocumentStore } from './documentStore';

const texts = () => useDocumentStore.getState().doc!.blocks.map((b) => b.text);
const ids = () => useDocumentStore.getState().doc!.blocks.map((b) => b.id);

beforeEach(() => {
  useDocumentStore.getState().load(
    createDocument({
      blocks: [createBlock({ text: 'あいうえお' }), createBlock({ text: 'かきくけこ' })],
    }),
  );
});

describe('documentStore', () => {
  it('カーソル位置で分割し、前の段落と結合できる', () => {
    const s = useDocumentStore.getState();
    s.splitBlock(ids()[0], 2);
    expect(texts()).toEqual(['あい', 'うえお', 'かきくけこ']);
    s.mergeWithPrevious(ids()[1]);
    expect(texts()).toEqual(['あいうえお', 'かきくけこ']);
  });

  it('並べ替え・複製・削除ができる', () => {
    const s = useDocumentStore.getState();
    s.moveBy(ids()[0], 1);
    expect(texts()).toEqual(['かきくけこ', 'あいうえお']);
    s.duplicateBlock(ids()[0]);
    expect(texts()).toEqual(['かきくけこ', 'かきくけこ', 'あいうえお']);
    expect(new Set(ids()).size).toBe(3);
    s.removeBlock(ids()[0]);
    expect(texts()).toEqual(['かきくけこ', 'あいうえお']);
  });

  it('クリアは元に戻せる', () => {
    useDocumentStore.getState().clearBlocks();
    expect(texts()).toEqual(['']);
    undo();
    expect(texts()).toEqual(['あいうえお', 'かきくけこ']);
  });

  it('同じ段落への連続入力は 1 つの履歴にまとまる', () => {
    const s = useDocumentStore.getState();
    const id = ids()[0];
    s.updateBlock(id, { text: 'あいうえおか' });
    s.updateBlock(id, { text: 'あいうえおかき' });
    undo();
    expect(texts()[0]).toBe('あいうえお');
  });
});
