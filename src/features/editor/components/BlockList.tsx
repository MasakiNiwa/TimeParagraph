import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Stack } from '@mantine/core';
import { useMemo, type ReactNode } from 'react';
import type { Block } from '@/domain/document';
import { useDocumentStore } from '../documentStore';
import { useEstimate } from '../useEstimate';
import { BlockItem, type DragHandleProps } from './BlockItem';

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
  const { estimate, sections } = useEstimate();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const sectionSec = useMemo(
    () => new Map(sections.map((s) => [s.headingId, s.totalSec])),
    [sections],
  );
  const numbers = useMemo(() => {
    let n = 0;
    return blocks.map((b) => (b.kind === 'paragraph' ? ++n : null));
  }, [blocks]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    useDocumentStore.getState().moveBlock(String(active.id), ids.indexOf(String(over.id)));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Stack gap="xs">
          {blocks.map((block, i) => (
            <Sortable key={block.id} id={block.id}>
              {(handle) => (
                <BlockItem
                  block={block}
                  index={i}
                  count={blocks.length}
                  number={numbers[i]}
                  estimate={estimate.byId.get(block.id)}
                  sectionSec={sectionSec.get(block.id)}
                  handle={handle}
                />
              )}
            </Sortable>
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}
