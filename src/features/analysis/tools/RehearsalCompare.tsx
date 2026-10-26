import { Select, Stack, Text } from '@mantine/core';
import { IconChartLine } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { formatDuration } from '@/domain/format';
import { calibrateSpeed } from '@/domain/rehearsal';
import { EChart, useChartColors, type EChartsOption } from '@/components/EChart';
import type { AnalysisContext, AnalysisTool } from '../types';

const dateLabel = (t: number) =>
  new Date(t).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function RehearsalCompare({ ctx }: { ctx: AnalysisContext }) {
  const { palette, axis, accent } = useChartColors();
  // 古い順(グラフの左から右へ)
  const history = useMemo(() => [...ctx.rehearsals].reverse(), [ctx.rehearsals]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = history.find((r) => r.id === selectedId) ?? history[history.length - 1];

  const trend = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      legend: { top: 0 },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: number) => formatDuration(v),
      },
      xAxis: {
        type: 'category',
        data: history.map((r) => dateLabel(r.startedAt)),
        axisLine: { lineStyle: { color: axis } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => formatDuration(v) },
        splitLine: { lineStyle: { color: axis } },
      },
      series: [
        {
          name: '実測',
          type: 'line',
          data: history.map((r) => Math.round(r.totalSec)),
          symbolSize: 10,
          itemStyle: { color: palette[0] },
        },
        {
          name: '推定',
          type: 'line',
          data: history.map((r) => Math.round(r.estimatedTotalSec)),
          lineStyle: { type: 'dashed' },
          itemStyle: { color: palette[1] },
        },
      ],
    }),
    [history, palette, axis],
  );

  const detail = useMemo<EChartsOption | null>(() => {
    if (!selected) return null;
    return {
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      legend: { top: 0 },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: number) => formatDuration(v),
      },
      xAxis: {
        type: 'category',
        data: selected.laps.map((_, i) => `段落${i + 1}`),
        axisLine: { lineStyle: { color: axis } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => formatDuration(v) },
        splitLine: { lineStyle: { color: axis } },
      },
      series: [
        {
          name: '推定',
          type: 'bar',
          data: selected.laps.map((l) => Math.round(l.estimatedSec * 10) / 10),
          itemStyle: { color: palette[1], borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20,
        },
        {
          name: '実測',
          type: 'bar',
          data: selected.laps.map((l) => ({
            value: Math.round(l.actualSec * 10) / 10,
            itemStyle: {
              color: l.actualSec > l.estimatedSec * 1.2 ? accent : palette[0],
              borderRadius: [3, 3, 0, 0],
            },
          })),
          barMaxWidth: 20,
        },
      ],
    };
  }, [selected, palette, axis, accent]);

  if (history.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        まだリハーサルの記録がありません。「練習」ページでリハーサルをすると、ここで推定との比較や上達の推移を見られます。
      </Text>
    );
  }

  const speed = selected ? calibrateSpeed(selected.laps) : null;

  return (
    <Stack gap="sm">
      <Text size="sm" fw={500}>
        合計時間の推移(点を押すとその回の内訳を表示)
      </Text>
      <EChart
        option={trend}
        height={220}
        onClick={(e) => setSelectedId(history[e.dataIndex]?.id ?? null)}
      />
      <Select
        label="内訳を見る回"
        data={history
          .map((r) => ({
            value: r.id,
            label: `${new Date(r.startedAt).toLocaleString('ja-JP')}(${formatDuration(r.totalSec)})`,
          }))
          .reverse()}
        value={selected?.id ?? null}
        onChange={setSelectedId}
        allowDeselect={false}
      />
      {selected && detail && (
        <>
          <Text size="sm" c="dimmed">
            実測 {formatDuration(selected.totalSec)} / 推定{' '}
            {formatDuration(selected.estimatedTotalSec)}
            {speed !== null &&
              ` ・ 話す速さ ${speed}${selected.method === 'chars' ? '字' : '拍'}/分`}
            (推定より 2 割以上長い段落を強調)
          </Text>
          <EChart
            option={detail}
            height={240}
            onClick={(e) => {
              const id = selected.laps[e.dataIndex]?.blockId;
              if (id && ctx.doc.blocks.some((b) => b.id === id)) ctx.openInEditor(id);
            }}
          />
        </>
      )}
    </Stack>
  );
}

export const rehearsalCompareTool: AnalysisTool = {
  id: 'rehearsal-compare',
  title: 'リハーサルの比較',
  description: 'リハーサルの実測と推定を比べ、回ごとの推移と段落ごとの差を見ます。',
  icon: IconChartLine,
  component: RehearsalCompare,
  summarize: (ctx) =>
    ctx.rehearsals.slice(0, 5).map((r) => ({
      date: new Date(r.startedAt).toISOString(),
      totalSec: Math.round(r.totalSec),
      estimatedTotalSec: Math.round(r.estimatedTotalSec),
      completed: r.completed,
      calibratedSpeed: calibrateSpeed(r.laps),
      laps: r.laps.map((l) => ({
        excerpt: l.excerpt,
        actualSec: Math.round(l.actualSec),
        estimatedSec: Math.round(l.estimatedSec),
      })),
    })),
};
