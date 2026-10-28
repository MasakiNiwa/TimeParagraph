import { Badge, ColorSwatch, Menu, UnstyledButton } from '@mantine/core';
import { IconTag, IconX } from '@tabler/icons-react';
import type { Block } from '@/domain/document';
import { getRole, roles } from '@/domain/roles';
import { useDocumentStore } from '../documentStore';
import classes from './BlockItem.module.css';

/** 内容のタイプ(導入・結論など)の表示と選択 */
export function RolePicker({ block }: { block: Block }) {
  const role = getRole(block.role);
  const set = (id: string | null) =>
    useDocumentStore.getState().updateBlock(block.id, { role: id });
  return (
    <Menu position="bottom-start" shadow="md" width={200} withinPortal>
      <Menu.Target>
        {role ? (
          <Badge
            component="button"
            type="button"
            size="sm"
            variant="light"
            color={role.color}
            tt="none"
            className={classes.roleBadge}
            aria-label={`内容のタイプ: ${role.label}(変更)`}
          >
            {role.label}
          </Badge>
        ) : (
          <UnstyledButton className={classes.roleAdd} aria-label="内容のタイプを設定">
            <IconTag size={12} />
            タイプ
          </UnstyledButton>
        )}
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>内容のタイプ</Menu.Label>
        {roles.map((r) => (
          <Menu.Item
            key={r.id}
            leftSection={<ColorSwatch size={10} color={`var(--mantine-color-${r.color}-5)`} />}
            onClick={() => set(r.id)}
            fw={r.id === block.role ? 700 : undefined}
          >
            {r.label}
          </Menu.Item>
        ))}
        {role && (
          <>
            <Menu.Divider />
            <Menu.Item leftSection={<IconX size={14} />} onClick={() => set(null)}>
              タイプを外す
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
