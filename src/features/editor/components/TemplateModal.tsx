import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { newId } from '@/domain/document';
import { getRole } from '@/domain/roles';
import {
  blocksToTemplate,
  builtInTemplates,
  templateToBlocks,
  type Template,
} from '@/domain/templates';
import { useDocumentStore } from '../documentStore';
import { createAndOpenDocument, runDocumentAction } from '../persistence';
import { useTemplateStore } from '../templateStore';

/** テンプレートの並びを、見出しとタイプのバッジで小さく表示する */
function Outline({ t }: { t: Template }) {
  return (
    <Group gap={4} wrap="wrap">
      {t.items.map((item, i) => {
        const role = getRole(item.role);
        return item.kind === 'heading' ? (
          <Text key={i} size="xs" fw={700} w="100%" mt={i ? 2 : 0}>
            ■ {item.text || '(見出し)'}
          </Text>
        ) : (
          <Badge key={i} size="xs" variant="light" color={role?.color ?? 'gray'} tt="none">
            {item.text ? `${role ? `${role.label}:` : ''}${item.text}` : (role?.label ?? '段落')}
          </Badge>
        );
      })}
    </Group>
  );
}

function TemplateCard({
  t,
  onUse,
  onDelete,
}: {
  t: Template;
  onUse: (t: Template, mode: 'new' | 'append') => void;
  onDelete?: () => void;
}) {
  return (
    <Card withBorder padding="sm">
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <div>
            <Text fw={600} size="sm">
              {t.name}
            </Text>
            {t.description && (
              <Text size="xs" c="dimmed">
                {t.description}
              </Text>
            )}
          </div>
          {onDelete && (
            <Tooltip label="このテンプレートを削除">
              <ActionIcon variant="subtle" color="gray" onClick={onDelete} aria-label="削除">
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <Outline t={t} />
        <Group gap="xs" justify="flex-end">
          <Button size="compact-xs" variant="default" onClick={() => onUse(t, 'append')}>
            この原稿の末尾に追加
          </Button>
          <Button size="compact-xs" onClick={() => onUse(t, 'new')}>
            新しい原稿で使う
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export function TemplateModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { templates, add, remove } = useTemplateStore();
  const [name, setName] = useState('');

  const use = async (t: Template, mode: 'new' | 'append') => {
    const blocks = templateToBlocks(t);
    if (mode === 'new') {
      if (!(await runDocumentAction(() => createAndOpenDocument({ title: t.name, blocks }))))
        return;
    } else {
      const s = useDocumentStore.getState();
      // 空の段落は取り除いてから末尾に追加する
      const kept = (s.doc?.blocks ?? []).filter(
        (b) => b.kind !== 'paragraph' || b.text.trim() || b.title.trim() || b.role,
      );
      s.setBlocks([...kept, ...blocks]);
    }
    notifications.show({
      message: `「${t.name}」の構成を使いました。案内に沿って書いてみてください`,
    });
    onClose();
  };

  const save = () => {
    const doc = useDocumentStore.getState().doc;
    if (!doc || !name.trim()) return;
    add(blocksToTemplate(doc.blocks, name.trim(), newId()));
    notifications.show({ message: `「${name.trim()}」をテンプレートとして保存しました` });
    setName('');
  };

  return (
    <Modal opened={opened} onClose={onClose} title="構成テンプレート" size="lg" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          話す内容の構成(見出しと段落のタイプの並び)をテンプレートから作れます。空の段落には書き方の案内が表示されます。
        </Text>
        <ScrollArea.Autosize mah="55dvh" type="auto" offsetScrollbars>
          <Stack gap="sm">
            {templates.length > 0 && (
              <>
                <Text size="xs" fw={700} c="dimmed">
                  マイテンプレート
                </Text>
                {templates.map((t) => (
                  <TemplateCard key={t.id} t={t} onUse={use} onDelete={() => remove(t.id)} />
                ))}
              </>
            )}
            <Text size="xs" fw={700} c="dimmed">
              組み込みテンプレート
            </Text>
            {builtInTemplates.map((t) => (
              <TemplateCard key={t.id} t={t} onUse={use} />
            ))}
          </Stack>
        </ScrollArea.Autosize>
        <Card withBorder padding="sm">
          <Stack gap={6}>
            <Text size="sm" fw={600}>
              この原稿の構成をテンプレートとして保存
            </Text>
            <Text size="xs" c="dimmed">
              見出しの文言と段落のタイプの並びを保存します。段落の本文は保存しません。
            </Text>
            <Group gap="xs" wrap="nowrap">
              <TextInput
                flex={1}
                size="xs"
                placeholder="テンプレートの名前(例: 定例会の報告)"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                aria-label="テンプレートの名前"
              />
              <Button
                size="xs"
                leftSection={<IconDeviceFloppy size={14} />}
                disabled={!name.trim()}
                onClick={save}
              >
                保存
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
}
