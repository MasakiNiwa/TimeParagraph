import {
  Button,
  Card,
  CopyButton,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { formatDuration } from '@/domain/format';
import { buildAnalysisSnapshot } from './snapshot';
import { analysisTools } from './tools';
import { useAnalysisContext } from './useAnalysisContext';

function Summary({ ctx }: { ctx: NonNullable<ReturnType<typeof useAnalysisContext>> }) {
  const target = ctx.doc.targetDurationSec;
  const items = [
    { label: '推定合計', value: formatDuration(ctx.estimate.totalSec) },
    { label: '目標', value: target !== null ? formatDuration(target) : '未設定' },
    { label: '段落 / セクション', value: `${ctx.stats.count} / ${ctx.sections.length}` },
    { label: 'リハーサル', value: `${ctx.rehearsals.length} 回` },
  ];
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      {items.map((i) => (
        <Card key={i.label} withBorder padding="sm">
          <Text size="xs" c="dimmed">
            {i.label}
          </Text>
          <Text fw={700} size="lg">
            {i.value}
          </Text>
        </Card>
      ))}
    </SimpleGrid>
  );
}

export function AnalysisPage() {
  const ctx = useAnalysisContext();
  const [tab, setTab] = useState<string | null>(analysisTools[0].id);

  if (!ctx) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <PageContainer title="分析">
      <Summary ctx={ctx} />
      <Tabs value={tab} onChange={setTab} variant="pills" keepMounted={false}>
        <ScrollArea type="never" offsetScrollbars={false}>
          <Tabs.List style={{ flexWrap: 'nowrap' }}>
            {analysisTools.map((t) => (
              <Tabs.Tab key={t.id} value={t.id} leftSection={<t.icon size={16} />}>
                {t.title}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </ScrollArea>
        {analysisTools.map((t) => (
          <Tabs.Panel key={t.id} value={t.id} pt="md">
            <Card withBorder padding="md">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  {t.description}
                </Text>
                <t.component ctx={ctx} />
              </Stack>
            </Card>
          </Tabs.Panel>
        ))}
      </Tabs>
      <Group justify="flex-end">
        <CopyButton value={JSON.stringify(buildAnalysisSnapshot(ctx), null, 2)}>
          {({ copied, copy }) => (
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              onClick={copy}
            >
              {copied ? 'コピーしました' : '分析結果を JSON でコピー'}
            </Button>
          )}
        </CopyButton>
      </Group>
    </PageContainer>
  );
}
