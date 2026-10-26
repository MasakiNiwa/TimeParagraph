import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { applyEdits, validateEdits, type BlockEdit } from '@/domain/edits';
import type { Block } from '@/domain/document';
import { formatDuration } from '@/domain/format';
import { useDocumentStore } from '@/features/editor/documentStore';
import { setProposalStatus, useAiStore } from './aiStore';
import classes from './AiPage.module.css';

const OP_LABEL: Record<BlockEdit['op'], string> = {
  replace: '書き換え',
  insert_after: '追加',
  delete: '削除',
};

function EditView({ edit, blocks }: { edit: BlockEdit; blocks: Block[] }) {
  const original = blocks.find((b) => b.id === edit.blockId);
  return (
    <div className={classes.edit}>
      <Group gap={6} mb={4}>
        <Badge size="xs" variant="light" tt="none">
          {OP_LABEL[edit.op]}
          {edit.op === 'insert_after' && edit.kind === 'heading' && '(見出し)'}
        </Badge>
        {edit.reason && (
          <Text size="xs" c="dimmed">
            {edit.reason}
          </Text>
        )}
      </Group>
      {edit.op !== 'insert_after' && original && (
        <Text size="sm" className={classes.before}>
          {original.text}
        </Text>
      )}
      {edit.op !== 'delete' && (
        <Text size="sm" className={classes.after}>
          {edit.text}
        </Text>
      )}
    </div>
  );
}

export function ProposalCard({ id }: { id: string }) {
  const proposal = useAiStore((s) => s.proposals[id]);
  const blocks = useDocumentStore((s) => s.doc?.blocks ?? []);
  if (!proposal) return null;
  const delta = proposal.afterSec - proposal.beforeSec;

  const apply = () => {
    const s = useDocumentStore.getState();
    const current = s.doc?.blocks ?? [];
    const v = validateEdits(current, proposal.edits);
    if (!v.ok) {
      notifications.show({
        color: 'red',
        message: '原稿が変更されたため、この提案を適用できません。もう一度依頼してください。',
      });
      return;
    }
    s.setBlocks(applyEdits(current, proposal.edits));
    setProposalStatus(id, 'applied');
    notifications.show({ message: '提案を適用しました(エディタの「元に戻す」で戻せます)' });
  };

  return (
    <Card withBorder padding="sm" className={classes.proposal}>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Text size="sm" fw={600}>
            {proposal.summary}
          </Text>
          {proposal.status !== 'pending' && (
            <Badge
              variant="light"
              color={proposal.status === 'applied' ? 'teal' : 'gray'}
              tt="none"
              style={{ flexShrink: 0 }}
            >
              {proposal.status === 'applied' ? '適用済み' : '見送り'}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          合計 {formatDuration(proposal.beforeSec)} → <b>{formatDuration(proposal.afterSec)}</b>(
          {delta >= 0 ? '+' : '−'}
          {formatDuration(Math.abs(delta))})・アプリの推定方式で計算
        </Text>
        {proposal.edits.map((e, i) => (
          <EditView key={i} edit={e} blocks={blocks} />
        ))}
        {proposal.status === 'pending' && (
          <Group justify="flex-end" gap="xs">
            <Button
              size="xs"
              variant="default"
              leftSection={<IconX size={14} />}
              onClick={() => setProposalStatus(id, 'dismissed')}
            >
              見送る
            </Button>
            <Button size="xs" leftSection={<IconCheck size={14} />} onClick={apply}>
              適用する
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
