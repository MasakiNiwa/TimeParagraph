import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Stack, UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Fragment, useEffect, useMemo, type ReactNode } from 'react';
import { sectionBlockIds } from '@/domain/sections';
import type { Block } from '@/domain/document';
import { useDocumentStore } from '../documentStore';
import { toggleCollapsed, useEditorUiStore } from '../editorUiStore';
import { useEstimate } from '../useEstimate';
import { BlockItem, type DragHandleProps } from './BlockItem';
import classes from './BlockItem.module.css';

/** セクションの末尾に置く「段落を追加」。ワンタップでそのセクションの最後に段落を足す */
function AddParagraphRow({ afterId }: { afterId: string }) {
  return (
    <UnstyledButton
      className={classes.addRow}
      onClick={() => useDocumentStore.getState().insertBlock(afterId)}
    >
      <IconPlus size={14} />
      段落を追加
    </UnstyledButton>
  );
}

function Sortable({ id, children }: { id: string; children: (h: DragHandleProps) => ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.85 : undefined,
      }}
    >
      {children({ attributes, listeners, setActivatorNodeRef })}
    </div>
  );
}

export function BlockList({ blocks }: { blocks: Block[] }) {
  const { estimate, sections, unitLabel } = useEstimate();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collapsed = useEditorUiStore((s) => s.collapsed);
  const dragging = useEditorUiStore((s) => s.draggingHeading);
  const hoistedId = useEditorUiStore((s) => s.hoisted);
  const outline = useEditorUiStore((s) => s.view === 'outline');
  const hoisted = blocks.some((b) => b.id === hoistedId) ? hoistedId : null;
  // たたんでいる見出し・ドラッグ中の見出しの配下の段落は表示しない。
  // 「このセクションだけ表示」中は、そのセクション以外を表示しない
  const { hidden, childCount } = useMemo(() => {
    const hidden = new Set<string>();
    if (hoisted) {
      const keep = new Set(sectionBlockIds(blocks, hoisted));
      for (const b of blocks) if (!keep.has(b.id)) hidden.add(b.id);
    }
    const childCount = new Map<string, number>();
    let owner: string | null = null;
    let hide = false;
    for (const b of blocks) {
      if (b.kind === 'heading') {
        owner = b.id;
        hide = (collapsed.includes(b.id) && b.id !== hoisted) || dragging === b.id;
        childCount.set(b.id, 0);
        continue;
      }
      if (owner) childCount.set(owner, (childCount.get(owner) ?? 0) + 1);
      if (hide) hidden.add(b.id);
    }
    return { hidden, childCount };
  }, [blocks, collapsed, dragging, hoisted]);

  // セクションの末尾(次が見出しの位置)に「段落を追加」を置く。
  // 原稿の末尾は、ページ下の「段落を追加」ボタンを使う(表示中のセクションだけのときは除く)
  const addRowAfter = useMemo(() => {
    const set = new Set<string>();
    const visible = blocks.filter((b) => !hidden.has(b.id));
    visible.forEach((b, i) => {
      const next = visible[i + 1];
      if (next ? next.kind === 'heading' : hoisted !== null) set.add(b.id);
    });
    return set;
  }, [blocks, hidden, hoisted]);
  const ids = useMemo(
    () => blocks.filter((b) => !hidden.has(b.id)).map((b) => b.id),
    [blocks, hidden],
  );

  // たたんだセクションの中の段落へ移動するとき(分析画面から開くなど)は、そのセクションを開く
  const focusId = useDocumentStore((s) => s.focus?.id);
  useEffect(() => {
    if (!focusId || !hidden.has(focusId)) return;
    const i = blocks.findIndex((b) => b.id === focusId);
    for (let j = i; j >= 0; j--)
      if (blocks[j].kind === 'heading') {
        if (collapsed.includes(blocks[j].id)) toggleCollapsed(blocks[j].id);
        break;
      }
  }, [focusId, hidden, blocks, collapsed]);
  const sectionSec = useMemo(
    () => new Map(sections.map((s) => [s.headingId, s.totalSec])),
    [sections],
  );
  const numbers = useMemo(() => {
    let n = 0;
    return blocks.map((b) => (b.kind === 'paragraph' ? ++n : null));
  }, [blocks]);

  const onDragStart = ({ active }: DragStartEvent) => {
    const block = blocks.find((b) => b.id === active.id);
    if (block?.kind === 'heading' && block.id !== hoisted)
      useEditorUiStore.setState({ draggingHeading: block.id });
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const wasHeading = useEditorUiStore.getState().draggingHeading === active.id;
    useEditorUiStore.setState({ draggingHeading: null });
    if (!over || active.id === over.id || active.id === hoisted) return;
    const s = useDocumentStore.getState();
    // 見出しは配下の段落ごと移動する
    if (wasHeading) s.moveSectionTo(String(active.id), String(over.id));
    else
      s.moveBlock(
        String(active.id),
        blocks.findIndex((b) => b.id === over.id),
      );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => useEditorUiStore.setState({ draggingHeading: null })}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Stack gap={outline ? 4 : 'xs'}>
          {blocks.map((block, i) =>
            hidden.has(block.id) ? null : (
              <Fragment key={block.id}>
                <Sortable id={block.id}>
                  {(handle) => (
                    <BlockItem
                      block={block}
                      index={i}
                      count={blocks.length}
                      number={numbers[i]}
                      estimate={estimate.byId.get(block.id)}
                      sectionSec={sectionSec.get(block.id)}
                      unitLabel={unitLabel}
                      handle={handle}
                      collapsed={
                        (collapsed.includes(block.id) && block.id !== hoisted) ||
                        dragging === block.id
                      }
                      childCount={childCount.get(block.id) ?? 0}
                      outline={outline}
                    />
                  )}
                </Sortable>
                {!outline &&
                  addRowAfter.has(block.id) &&
                  !(
                    block.kind === 'heading' &&
                    collapsed.includes(block.id) &&
                    block.id !== hoisted
                  ) && <AddParagraphRow afterId={block.id} />}
              </Fragment>
            ),
          )}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}
