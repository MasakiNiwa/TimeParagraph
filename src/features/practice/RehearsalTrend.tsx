import { Text } from '@mantine/core';
import { useMemo } from 'react';
import { EChart, useChartColors, type EChartsOption } from '@/components/EChart';
import { formatDuration } from '@/domain/format';
import type { Rehearsal } from '@/domain/rehearsal';

const dateLabel = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** リハーサルの実測の推移。途中までの記録は白抜きの点で示す */
export function RehearsalTrend({
  history,
  targetSec,
}: {
  history: Rehearsal[];
  targetSec: number | null;
}) {
  const { palette, axis } = useChartColors();
  // 古い順に並べる(履歴は新しい順)
  const rows = useMemo(() => [...history].reverse().slice(-20), [history]);

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
      legend: { top: 0, data: ['実測', '推定'] },
      tooltip: {
        trigger: 'axis',
        formatter: (ps: { dataIndex: number }[]) => {
          const r = rows[ps[0]?.dataIndex ?? 0];
          if (!r) return '';
          return `${dateLabel(r.startedAt)}${r.completed ? '' : '(途中まで)'}<br/>実測 ${formatDuration(r.totalSec)} / 推定 ${formatDuration(r.estimatedTotalSec)}`;
        },
      },
      xAxis: {
        type: 'category',
        data: rows.map((r) => dateLabel(r.startedAt)),
        axisLabel: { hideOverlap: true },
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
          data: rows.map((r) => ({
            value: Math.round(r.totalSec),
            symbol: r.completed ? 'circle' : 'emptyCircle',
          })),
          symbolSize: 7,
          itemStyle: { color: palette[0] },
          lineStyle: { color: palette[0] },
          ...(targetSec
            ? {
                markLine: {
                  symbol: 'none',
                  label: { formatter: '目標', position: 'insideEndTop' },
                  lineStyle: { type: 'dashed', color: palette[2] },
                  data: [{ yAxis: targetSec }],
                },
              }
            : {}),
        },
        {
          name: '推定',
          type: 'line',
          data: rows.map((r) => Math.round(r.estimatedTotalSec)),
          symbol: 'none',
          itemStyle: { color: palette[1] },
          lineStyle: { color: palette[1], type: 'dashed', opacity: 0.7 },
        },
      ],
    }),
    [rows, palette, axis, targetSec],
  );

  if (rows.length < 2) return null;
  return (
    <div>
      <Text size="xs" c="dimmed" mb={4}>
        実測の推移(直近 {rows.length} 回)
      </Text>
      <EChart option={option} height={200} />
    </div>
  );
}
