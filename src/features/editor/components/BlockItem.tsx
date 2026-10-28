import { ActionIcon, Badge, Group, Text, Textarea, TextInput, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronRight, IconGripVertical } from '@tabler/icons-react';
import { memo, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Block } from '@/domain/document';
import type { BlockEstimate } from '@/domain/estimate';
import { formatDuration, formatDurationJa } from '@/domain/format';
import { useSettings } from '@/features/settings/settingsStore';
import { getRole } from '@/domain/roles';
import { useDocumentStore } from '../documentStore';
import { toggleCollapsed } from '../editorUiStore';
import { BlockMenu } from './BlockMenu';
import { BlockSettingsModal } from './BlockSettingsModal';
import { RolePicker } from './RolePicker';
import classes from './BlockItem.module.css';

export interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
}

interface Props {
  block: Block;
  index: number;
  count: number;
  /** 段落の通し番号(見出しは null) */
  number: number | null;
  estimate: BlockEstimate | undefined;
  sectionSec: number | undefined;
  unitLabel: string;
  handle: DragHandleProps;
  /** 見出しをたたんでいるか */
  collapsed?: boolean;
  /** 見出しの配下の段落数 */
  childCount?: number;
}

const FONT_SIZE = { sm: 'sm', md: 'md', lg: 'lg' } as const;

function useFocusRequest(
  id: string,
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
) {
  const focus = useDocumentStore((s) => (s.focus?.id === id ? s.focus : null));
  useEffect(() => {
    const el = ref.current;
    if (!focus || !el) return;
    el.focus({ preventScroll: false });
    const pos = focus.caret === 'end' ? el.value.length : focus.caret;
    el.setSelectionRange(pos, pos);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focus, ref]);
}

function handleKeys(
  e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  block: Block,
  index: number,
) {
  const s = useDocumentStore.getState();
  const el = e.currentTarget;
  const mod = e.ctrlKey || e.metaKey;
  if (e.nativeEvent.isComposing) return;

  if (mod && e.key === 'Enter') {
    // Ctrl+Enter: カーソル位置で分割(末尾なら新しい段落を追加)
    e.preventDefault();
    const pos = el.selectionStart ?? el.value.length;
    if (block.kind === 'heading' || pos >= el.value.length) s.insertBlock(block.id);
    else s.splitBlock(block.id, pos);
  } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    s.moveBy(block.id, e.key === 'ArrowUp' ? -1 : 1);
  } else if (
    e.key === 'Backspace' &&
    index > 0 &&
    el.selectionStart === 0 &&
    el.selectionEnd === 0
  ) {
    // 先頭で Backspace: 空なら削除、そうでなければ前の段落に結合
    const prev = s.doc?.blocks[index - 1];
    if (block.text === '') {
      e.preventDefault();
      s.removeBlock(block.id);
    } else if (prev && prev.kind === block.kind) {
      e.preventDefault();
      s.mergeWithPrevious(block.id);
    }
  }
}

function DragHandle({ handle }: { handle: DragHandleProps }) {
  return (
    <ActionIcon
      ref={handle.setActivatorNodeRef}
      variant="subtle"
      color="gray"
      className={classes.handle}
      aria-label="ドラッグして並べ替え"
      {...handle.attributes}
      {...handle.listeners}
    >
      <IconGripVertical size={18} />
    </ActionIcon>
  );
}

function ParagraphItem({ block, index, count, number, estimate, unitLabel, handle }: Props) {
  const fontSize = useSettings().editor.fontSize;
  const ref = useRef<HTMLTextAreaElement>(null);
  const [settingsOpened, settings] = useDisclosure(false);
  useFocusRequest(block.id, ref);

  return (
    <div className={classes.card} data-kind="paragraph">
      <div className={classes.side}>
        <DragHandle handle={handle} />
        <Text size="xs" c="dimmed" className={classes.number}>
          {number}
        </Text>
      </div>
      <div className={classes.body}>
        <Textarea
          ref={ref}
          variant="unstyled"
          autosize
          minRows={2}
          size={FONT_SIZE[fontSize]}
          placeholder={block.hint || getRole(block.role)?.hint || '話す内容を入力…'}
          value={block.text}
          onChange={(e) =>
            useDocumentStore.getState().updateBlock(block.id, { text: e.currentTarget.value })
          }
          onKeyDown={(e) => handleKeys(e, block, index)}
          classNames={{ input: classes.textarea }}
          aria-label={`パラグラフ ${number}`}
        />
        {block.note && (
          <Text size="xs" c="dimmed" className={classes.note}>
            📝 {block.note}
          </Text>
        )}
        <Group gap="xs" justify="space-between" wrap="nowrap" className={classes.meta}>
          <Group gap={8} wrap="wrap">
            <RolePicker block={block} />
            <Text size="xs" c="dimmed">
              {formatDuration(estimate?.startSec ?? 0)} から
            </Text>
            <Text size="xs" c="dimmed">
              {Math.round(estimate?.units ?? 0)}
              {unitLabel}
            </Text>
            {block.speedFactor !== 1 && (
              <Badge size="xs" variant="outline" color="gray" tt="none">
                速さ×{block.speedFactor.toFixed(2)}
              </Badge>
            )}
            {block.pauseAfterSec !== null && (
              <Badge size="xs" variant="outline" color="gray" tt="none">
                間 {block.pauseAfterSec}秒
              </Badge>
            )}
          </Group>
          <Group gap={4} wrap="nowrap">
            <Badge variant="light" size="md" tt="none" className={classes.time}>
              約{formatDurationJa(estimate?.speakSec ?? 0)}
            </Badge>
            <BlockMenu block={block} index={index} count={count} onOpenSettings={settings.open} />
          </Group>
        </Group>
      </div>
      <BlockSettingsModal block={block} opened={settingsOpened} onClose={settings.close} />
    </div>
  );
}

function HeadingItem({
  block,
  index,
  count,
  sectionSec,
  handle,
  collapsed = false,
  childCount = 0,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useFocusRequest(block.id, ref);
  return (
    <div className={classes.card} data-kind="heading">
      <div className={classes.side}>
        <DragHandle handle={handle} />
      </div>
      <div className={classes.body}>
        <Group gap={4} wrap="nowrap" align="center">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => toggleCollapsed(block.id)}
            aria-label={collapsed ? 'セクションを開く' : 'セクションをたたむ'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
          <TextInput
            ref={ref}
            flex={1}
            variant="unstyled"
            size="lg"
            placeholder="見出し"
            value={block.text}
            onChange={(e) =>
              useDocumentStore.getState().updateBlock(block.id, { text: e.currentTarget.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && !(e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                // たたんでいると追加した段落が見えないので、開いてから追加する
                if (collapsed) toggleCollapsed(block.id);
                useDocumentStore.getState().insertBlock(block.id);
                return;
              }
              handleKeys(e, block, index);
            }}
            classNames={{ input: classes.headingInput }}
            aria-label="見出し"
          />
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            計 {formatDuration(sectionSec ?? 0)}
          </Text>
          <BlockMenu block={block} index={index} count={count} />
        </Group>
        <Group gap={8} pl={30} pb={2}>
          <RolePicker block={block} />
          {collapsed && (
            <UnstyledButton onClick={() => toggleCollapsed(block.id)}>
              <Text size="xs" c="dimmed">
                {childCount} 段落をたたんでいます
              </Text>
            </UnstyledButton>
          )}
        </Group>
      </div>
    </div>
  );
}

export const BlockItem = memo(function BlockItem(props: Props) {
  return props.block.kind === 'heading' ? <HeadingItem {...props} /> : <ParagraphItem {...props} />;
});
