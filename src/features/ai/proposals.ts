import { applyEdits, validateEdits } from '@/domain/edits';
import { useDocumentStore } from '@/features/editor/documentStore';
import { setProposalStatus, useAiStore } from './aiStore';

/** 提案を作った時点の原稿と一致するときだけ適用する。本文の後編集も保護する */
export function applyProposal(id: string): boolean {
  const proposal = useAiStore.getState().proposals[id];
  const { doc, setBlocks } = useDocumentStore.getState();
  if (
    !doc ||
    !proposal ||
    proposal.status !== 'pending' ||
    doc.id !== proposal.sourceDocId ||
    JSON.stringify(doc.blocks) !== JSON.stringify(proposal.sourceBlocks) ||
    !validateEdits(doc.blocks, proposal.edits).ok
  )
    return false;
  setBlocks(applyEdits(doc.blocks, proposal.edits));
  setProposalStatus(id, 'applied');
  return true;
}
