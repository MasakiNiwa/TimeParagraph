import { Accordion, Group, Text } from '@mantine/core';
import type { ComponentType, ReactNode } from 'react';
import classes from './CollapsibleSections.module.css';

export interface SectionDef {
  id: string;
  title: string;
  icon?: ComponentType<{ size?: number | string; stroke?: number }>;
  content: ReactNode;
}

/** 見出しごとに折りたためるセクション群。既定ではすべて閉じた状態で表示する */
export function CollapsibleSections({ sections }: { sections: SectionDef[] }) {
  return (
    <Accordion
      multiple
      defaultValue={[]}
      variant="separated"
      chevronPosition="right"
      classNames={{ item: classes.item }}
    >
      {sections.map(({ id, title, icon: Icon, content }) => (
        <Accordion.Item key={id} value={id}>
          <Accordion.Control>
            <Group gap="sm" wrap="nowrap">
              {Icon && <Icon size={18} stroke={1.6} />}
              <Text fw={500}>{title}</Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>{content}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
