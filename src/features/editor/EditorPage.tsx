import { Button, Group, Loader, Menu, Stack, Text, TextInput, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import {
  IconDotsVertical,
  IconFiles,
  IconFileText,
  IconHeading,
  IconPlus,
  IconTextPlus,
  IconTemplate,
  IconFold,
  IconArrowsVertical,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useMorphAnalysis } from '@/features/estimation/useEstimator';
import { BlockList } from './components/BlockList';
import { BulkInputModal } from './components/BulkInputModal';
import { DocumentsModal } from './components/DocumentsModal';
import { ExchangeMenuItems } from './components/ExchangeMenuItems';
import { SummaryBar } from './components/SummaryBar';
import { TemplateModal } from './components/TemplateModal';
import { setAllCollapsed } from './editorUiStore';
import { redo, undo, useDocumentStore } from './documentStore';
import { createAndOpenDocument, runDocumentAction } from './persistence';
import { SaveStatus } from './components/SaveStatus';
import classes from './EditorPage.module.css';

function confirmClear() {
  modals.openConfirmModal({
    title: '原稿をクリア',
    children: (
      <Text size="sm">
        すべてのパラグラフと見出しを削除します。直後であれば「元に戻す」で復元できます。
      </Text>
    ),
    labels: { confirm: 'クリア', cancel: 'キャンセル' },
    confirmProps: { color: 'red' },
    onConfirm: () => useDocumentStore.getState().clearBlocks(),
  });
}

function useUndoShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.isComposing) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      // メモ・一括入力などのダイアログでは、その入力欄自身の Undo を使う
      if (target?.closest('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function EditorPage() {
  const doc = useDocumentStore((s) => s.doc);
  const [docsOpened, docsModal] = useDisclosure(false);
  const [bulkOpened, bulkModal] = useDisclosure(false);
  const [templateOpened, templateModal] = useDisclosure(false);

  useUndoShortcuts();
  useMorphAnalysis(doc?.blocks);

  if (!doc) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  const lastId = doc.blocks[doc.blocks.length - 1]?.id ?? null;
  const s = useDocumentStore.getState;

  return (
    <PageContainer>
      <Group gap="xs" wrap="nowrap">
        <TextInput
          flex={1}
          variant="unstyled"
          size="xl"
          value={doc.title}
          placeholder="無題の原稿"
          onChange={(e) => s().setTitle(e.currentTarget.value)}
          classNames={{ input: classes.title }}
          aria-label="原稿のタイトル"
        />
        <Menu position="bottom-end" shadow="md" width={260}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label="原稿のメニュー">
              <IconDotsVertical size={20} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconFiles size={16} />} onClick={docsModal.open}>
              原稿の一覧
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileText size={16} />}
              onClick={() => void runDocumentAction(() => createAndOpenDocument())}
            >
              新しい原稿
            </Menu.Item>
            <Menu.Item leftSection={<IconTemplate size={16} />} onClick={templateModal.open}>
              構成テンプレート…
            </Menu.Item>
            <Menu.Item leftSection={<IconTextPlus size={16} />} onClick={bulkModal.open}>
              テキストから一括入力
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFold size={16} />}
              onClick={() =>
                setAllCollapsed(doc.blocks.filter((b) => b.kind === 'heading').map((b) => b.id))
              }
            >
              すべてのセクションをたたむ
            </Menu.Item>
            <Menu.Item
              leftSection={<IconArrowsVertical size={16} />}
              onClick={() => setAllCollapsed([])}
            >
              すべてのセクションを開く
            </Menu.Item>
            <Menu.Divider />
            <ExchangeMenuItems />
          </Menu.Dropdown>
        </Menu>
      </Group>

      <SaveStatus />
      <SummaryBar onClear={confirmClear} />

      <Stack gap="xs">
        <BlockList blocks={doc.blocks} />
        <Group gap="xs" mt="xs">
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => s().insertBlock(lastId)}
          >
            段落を追加
          </Button>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconHeading size={16} />}
            onClick={() => s().insertBlock(lastId, { kind: 'heading' })}
          >
            見出しを追加
          </Button>
        </Group>
        <Text size="xs" c="dimmed" visibleFrom="sm" mt="sm">
          Ctrl+Enter: 段落を分割/追加 ・ 先頭で Backspace: 前の段落と結合 ・ Alt+↑↓: 移動 ・ Ctrl+Z:
          元に戻す
        </Text>
      </Stack>

      <DocumentsModal opened={docsOpened} onClose={docsModal.close} />
      <BulkInputModal opened={bulkOpened} onClose={bulkModal.close} />
      <TemplateModal opened={templateOpened} onClose={templateModal.close} />
    </PageContainer>
  );
}
