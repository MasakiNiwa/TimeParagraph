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

it('先頭の上に段落を追加すると先頭に入る', () => {
  useDocumentStore.getState().insertBlock(null, { text: '先頭' });
  expect(texts()).toEqual(['先頭', 'あいうえお', 'かきくけこ']);
});

it('Undo 直後の再入力も元に戻せ、古い Redo は残らない', () => {
  const s = useDocumentStore.getState();
  const id = ids()[0];
  s.updateBlock(id, { text: '変更1' });
  undo();
  s.updateBlock(id, { text: '変更2' });
  expect(useDocumentStore.temporal.getState().futureStates).toHaveLength(0);
  undo();
  expect(texts()[0]).toBe('あいうえお');
});

it('分割・結合で本文の空白とメモを失わない', () => {
  const s = useDocumentStore.getState();
  const id = ids()[0];
  s.updateBlock(id, { text: '前半  後半', speedFactor: 1.3, pauseAfterSec: 4, note: '元のメモ' });
  s.splitBlock(id, 4);
  expect(texts().slice(0, 2).join('')).toBe('前半  後半');
  expect(s.doc?.blocks[0].id).toBe(id);
  expect(useDocumentStore.getState().doc!.blocks[1].speedFactor).toBe(1.3);
  s.updateBlock(ids()[1], { note: '後半のメモ' });
  s.mergeWithPrevious(ids()[1]);
  expect(useDocumentStore.getState().doc!.blocks[0].note).toContain('後半のメモ');
});

describe('セクション操作', () => {
  const setup = () => {
    useDocumentStore.getState().load(
      createDocument({
        blocks: [
          createBlock({ kind: 'heading', text: 'A' }),
          createBlock({ text: 'a1' }),
          createBlock({ kind: 'heading', text: 'B' }),
          createBlock({ text: 'b1' }),
          createBlock({ text: 'b2' }),
        ],
      }),
    );
    return (t: string) => useDocumentStore.getState().doc!.blocks.find((b) => b.text === t)!.id;
  };

  it('見出しの上下移動は配下の段落ごと動き、1 回の Undo で戻る', () => {
    const id = setup();
    useDocumentStore.getState().moveBy(id('B'), -1);
    expect(texts()).toEqual(['B', 'b1', 'b2', 'A', 'a1']);
    undo();
    expect(texts()).toEqual(['A', 'a1', 'B', 'b1', 'b2']);
  });

  it('ドラッグ相当の移動とセクションごとの削除', () => {
    const id = setup();
    useDocumentStore.getState().moveSectionTo(id('A'), id('b2'));
    expect(texts()).toEqual(['B', 'b1', 'b2', 'A', 'a1']);
    useDocumentStore.getState().removeSection(id('B'));
    expect(texts()).toEqual(['A', 'a1']);
  });
});
