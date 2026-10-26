import { Anchor, Badge, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { useMemo } from 'react';
import { formatDuration } from '@/domain/format';
import { EChart, useChartColors, type EChartsOption } from '@/components/EChart';
import type { AnalysisContext, AnalysisTool } from '../types';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </div>
  );
}

function ParagraphBalance({ ctx }: { ctx: AnalysisContext }) {
  const { stats } = ctx;
  const { palette, axis, accent } = useChartColors();

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: { dataIndex: number }) => {
          const s = stats.all[p.dataIndex];
          return `段落${s.index}: ${s.label}<br/>${formatDuration(s.sec)}(中央値の ${s.ratio.toFixed(1)} 倍)`;
        },
      },
      xAxis: {
        type: 'category',
        data: stats.all.map((s) => String(s.index)),
        axisLine: { lineStyle: { color: axis } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => formatDuration(v) },
        splitLine: { lineStyle: { color: axis } },
      },
      series: [
        {
          type: 'bar',
          data: stats.all.map((s) => ({
            value: Math.round(s.sec * 10) / 10,
            itemStyle: {
              color: s.ratio >= 2 || (s.ratio > 0 && s.ratio <= 1 / 3) ? accent : palette[0],
              borderRadius: [3, 3, 0, 0],
            },
          })),
          barMaxWidth: 28,
          markLine: {
            symbol: 'none',
            label: { formatter: '中央値', position: 'insideEndTop' },
            lineStyle: { type: 'dashed', color: palette[1] },
            data: [{ yAxis: Math.round(stats.medianSec * 10) / 10 }],
          },
        },
      ],
    }),
    [stats, palette, axis, accent],
  );

  if (stats.count === 0) return <Text c="dimmed">段落がありません。</Text>;

  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Stat label="段落数" value={String(stats.count)} />
        <Stat label="平均" value={formatDuration(stats.meanSec)} />
        <Stat label="中央値" value={formatDuration(stats.medianSec)} />
        <Stat
          label="最短 / 最長"
          value={`${formatDuration(stats.minSec)} / ${formatDuration(stats.maxSec)}`}
        />
      </SimpleGrid>
      <EChart
        option={option}
        height={240}
        onClick={(e) => ctx.openInEditor(stats.all[e.dataIndex].blockId)}
      />
      {stats.long.length + stats.short.length === 0 ? (
        <Text size="sm" c="dimmed">
          段落の長さは比較的そろっています。
        </Text>
      ) : (
        <Stack gap={4}>
          {[...stats.long, ...stats.short].map((s) => (
            <Group key={s.blockId} gap="xs" wrap="nowrap">
              <Badge
                size="sm"
                variant="light"
                color={s.ratio >= 2 ? 'orange' : 'gray'}
                tt="none"
                style={{ flexShrink: 0 }}
              >
                {s.ratio >= 2 ? '長い' : '短い'}
              </Badge>
              <Anchor size="sm" component="button" onClick={() => ctx.openInEditor(s.blockId)}>
                段落{s.index}: {s.label}
              </Anchor>
              <Text size="xs" c="dimmed">
                {formatDuration(s.sec)}
              </Text>
            </Group>
          ))}
          <Text size="xs" c="dimmed">
            中央値の 2 倍以上を「長い」、1/3
            以下を「短い」としています。分割・統合の目安にしてください。
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

export const paragraphBalanceTool: AnalysisTool = {
  id: 'paragraph-balance',
  title: '段落のバランス',
  description: '段落ごとの長さのばらつきを見て、長すぎる・短すぎる段落を見つけます。',
  icon: IconChartBar,
  component: ParagraphBalance,
  summarize: ({ stats }) => ({
    count: stats.count,
    meanSec: Math.round(stats.meanSec),
    medianSec: Math.round(stats.medianSec),
    long: stats.long.map((s) => ({ index: s.index, sec: Math.round(s.sec), ratio: s.ratio })),
    short: stats.short.map((s) => ({ index: s.index, sec: Math.round(s.sec), ratio: s.ratio })),
  }),
};
