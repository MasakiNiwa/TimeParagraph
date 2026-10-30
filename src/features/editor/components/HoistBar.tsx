import { Button, Group, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { Block } from '@/domain/document';
import { formatDuration } from '@/domain/format';
import { setHoisted, useEditorUiStore } from '../editorUiStore';
import { useEstimate } from '../useEstimate';

/** 「このセクションだけ表示」しているときの上部のバー。全体の表示へ戻る */
export function HoistBar({ blocks }: { blocks: Block[] }) {
  const hoisted = useEditorUiStore((s) => s.hoisted);
  const { sections } = useEstimate();
  const heading = blocks.find((b) => b.id === hoisted);
  if (!heading) return null;
  const sec = sections.find((s) => s.headingId === heading.id)?.totalSec ?? 0;
  return (
    <Group gap="xs" wrap="nowrap" justify="space-between">
      <Button
        variant="subtle"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => setHoisted(null)}
      >
        全体に戻る
      </Button>
      <Text size="xs" c="dimmed" truncate>
        「{heading.text || '見出し'}」だけを表示中 ・ 計 {formatDuration(sec)}
      </Text>
    </Group>
  );
}
