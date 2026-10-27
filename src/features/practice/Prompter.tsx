import { Badge, Group, Text } from '@mantine/core';
import { useEffect, useRef } from 'react';
import type { Block } from '@/domain/document';
import type { DocumentEstimate } from '@/domain/estimate';
import { formatDuration } from '@/domain/format';
import { useSettings } from '@/features/settings/settingsStore';
import classes from './Prompter.module.css';

export interface PrompterState {
  /** 強調表示する段落 */
  currentId: string | null;
  /** 計測済みの段落の実測(秒) */
  actualById?: Map<string, number>;
  /** 強調中の段落に添える案内 */
  currentHint?: string;
}

/** 原稿を大きな文字で表示し、現在の段落を強調する */
export function Prompter({
  blocks,
  estimate,
  state,
  onSelect,
}: {
  blocks: Block[];
  estimate: DocumentEstimate;
  state: PrompterState;
  onSelect?: (id: string) => void;
}) {
  const fontSize = useSettings().editor.fontSize;
  const refs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!state.currentId) return;
    refs.current.get(state.currentId)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [state.currentId]);

  return (
    <div className={classes.root} data-size={fontSize}>
      {blocks.map((b) => {
        if (b.kind === 'heading') {
          return b.text.trim() ? (
            <Text key={b.id} className={classes.heading} fw={700}>
              {b.text}
            </Text>
          ) : null;
        }
        if (!b.text.trim()) return null;
        const e = estimate.byId.get(b.id);
        const est = (e?.speakSec ?? 0) + (e?.pauseSec ?? 0);
        const actual = state.actualById?.get(b.id);
        const current = state.currentId === b.id;
        return (
          <div
            key={b.id}
            ref={(el) => {
              if (el) refs.current.set(b.id, el);
              else refs.current.delete(b.id);
            }}
            className={classes.paragraph}
            data-current={current || undefined}
            data-done={actual !== undefined || undefined}
            data-clickable={onSelect ? true : undefined}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={() => onSelect?.(b.id)}
            onKeyDown={(e) => {
              if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                e.stopPropagation();
                if (!e.repeat) onSelect(b.id);
              }
            }}
          >
            <Text className={classes.text}>{b.text}</Text>
            <Group gap="xs" mt={6}>
              <Text size="xs" c="dimmed">
                {formatDuration(e?.startSec ?? 0)} から ・ 推定 {formatDuration(est)}
              </Text>
              {current && state.currentHint && (
                <Badge size="sm" variant="filled" tt="none">
                  {state.currentHint}
                </Badge>
              )}
              {actual !== undefined && (
                <Badge
                  size="sm"
                  variant="light"
                  tt="none"
                  color={actual > est * 1.1 ? 'orange' : 'calm'}
                >
                  実測 {formatDuration(actual)}
                </Badge>
              )}
            </Group>
          </div>
        );
      })}
    </div>
  );
}
