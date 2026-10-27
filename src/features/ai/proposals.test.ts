import { beforeEach, expect, it } from 'vitest';
import { createBlock, createDocument } from '@/domain/document';
import { undo, useDocumentStore } from '@/features/editor/documentStore';
import { useAiStore, type Proposal } from './aiStore';
import { applyProposal } from './proposals';

let proposal: Proposal;
beforeEach(() => {
  const doc = createDocument({ blocks: [createBlock({ text: '元の本文' })] });
  useDocumentStore.getState().load(doc);
  proposal = {
    id: 'proposal',
    summary: '修正案',
    sourceDocId: doc.id,
    sourceBlocks: doc.blocks,
    edits: [{ op: 'replace', blockId: doc.blocks[0].id, text: '修正後' }],
    beforeSec: 1,
    afterSec: 1,
    status: 'pending',
  };
  useAiStore.setState({ proposals: { [proposal.id]: proposal } });
});
it('同じ id の段落でも、提案後に書き直した内容を上書きしない', () => {
  useDocumentStore.getState().updateBlock(proposal.sourceBlocks[0].id, { text: '手で直した本文' });
  expect(applyProposal(proposal.id)).toBe(false);
  expect(useDocumentStore.getState().doc!.blocks[0].text).toBe('手で直した本文');
});
it('先頭への追加だけの提案も、別の原稿には適用しない', () => {
  proposal.edits = [{ op: 'insert_after', blockId: null, text: '追加' }];
  useDocumentStore.getState().load(createDocument());
  expect(applyProposal(proposal.id)).toBe(false);
});
it('一致する原稿には一度だけ適用でき、Undo で戻せる', () => {
  expect(applyProposal(proposal.id)).toBe(true);
  expect(applyProposal(proposal.id)).toBe(false);
  expect(useDocumentStore.getState().doc!.blocks[0].text).toBe('修正後');
  undo();
  expect(useDocumentStore.getState().doc!.blocks[0].text).toBe('元の本文');
});
