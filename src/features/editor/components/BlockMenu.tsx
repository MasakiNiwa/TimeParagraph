import { ActionIcon, Menu } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconCopy,
  IconDots,
  IconAdjustments,
  IconHeading,
  IconPilcrow,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconTrash,
} from '@tabler/icons-react';
import type { Block } from '@/domain/document';
import { useDocumentStore } from '../documentStore';

interface Props {
  block: Block;
  index: number;
  count: number;
  onOpenSettings?: () => void;
}

export function BlockMenu({ block, index, count, onOpenSettings }: Props) {
  const s = useDocumentStore.getState;
  const prevId = () => s().doc?.blocks[index - 1]?.id ?? null;
  return (
    <Menu position="bottom-end" withinPortal shadow="md" width={220}>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="ブロックのメニュー">
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconRowInsertTop size={16} />}
          onClick={() => s().insertBlock(prevId())}
        >
          上に段落を追加
        </Menu.Item>
        <Menu.Item
          leftSection={<IconRowInsertBottom size={16} />}
          onClick={() => s().insertBlock(block.id)}
        >
          下に段落を追加
        </Menu.Item>
        <Menu.Item
          leftSection={<IconHeading size={16} />}
          onClick={() => s().insertBlock(block.id, { kind: 'heading' })}
        >
          下に見出しを追加
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconArrowUp size={16} />}
          disabled={index === 0}
          onClick={() => s().moveBy(block.id, -1)}
        >
          上へ移動
        </Menu.Item>
        <Menu.Item
          leftSection={<IconArrowDown size={16} />}
          disabled={index === count - 1}
          onClick={() => s().moveBy(block.id, 1)}
        >
          下へ移動
        </Menu.Item>
        <Menu.Item
          leftSection={<IconCopy size={16} />}
          onClick={() => s().duplicateBlock(block.id)}
        >
          複製
        </Menu.Item>
        <Menu.Item
          leftSection={
            block.kind === 'heading' ? <IconPilcrow size={16} /> : <IconHeading size={16} />
          }
          onClick={() =>
            s().updateBlock(block.id, { kind: block.kind === 'heading' ? 'paragraph' : 'heading' })
          }
        >
          {block.kind === 'heading' ? '段落に変換' : '見出しに変換'}
        </Menu.Item>
        {onOpenSettings && (
          <Menu.Item leftSection={<IconAdjustments size={16} />} onClick={onOpenSettings}>
            話す速さ・間・メモ…
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() => s().removeBlock(block.id)}
        >
          削除
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
