import { ActionIcon, Anchor, Breadcrumbs, Table, Text, Tooltip } from '@mantine/core';
import { IconArrowUpRight, IconSitemap } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { findPath, type TimeNode } from '@/domain/analysis';
import { formatDuration } from '@/domain/format';
import { escapeHtml } from '@/lib/escapeHtml';
import { EChart, useChartColors, type EChartsOption } from '@/components/EChart';
import type { AnalysisContext, AnalysisTool } from '../types';

const LEVEL_LABEL: Record<TimeNode['level'], string> = {
  document: '全体',
  section: 'セクション',
  paragraph: '段落',
  sentence: '文',
};

function TimeDrilldown({ ctx }: { ctx: AnalysisContext }) {
  const [path, setPath] = useState<string[]>([]);
  const { palette, axis } = useChartColors();
  const nodes = findPath(ctx.tree, path);
  const current = nodes[nodes.length - 1];
  const children = useMemo(() => current.children ?? [], [current]);
  const total = current.sec || 1;

  const drill = (child: TimeNode) => {
    if (child.children?.length)
      setPath(
        nodes
          .slice(1)
          .map((n) => n.id)
          .concat(child.id),
      );
  };

  const option = useMemo<EChartsOption>(() => {
    const items = [...children].reverse();
    return {
      grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: { dataIndex: number }) => {
          const n = items[p.dataIndex];
          return `${escapeHtml(n.label)}<br/>${formatDuration(n.sec)}(${Math.round((n.sec / total) * 100)}%)`;
        },
      },
      xAxis: {
        type: 'value',
        splitNumber: 3,
        axisLabel: { formatter: (v: number) => formatDuration(v), hideOverlap: true },
        splitLine: { lineStyle: { color: axis } },
      },
      yAxis: {
        type: 'category',
        data: items.map((n) => n.label),
        axisLabel: { width: 110, overflow: 'truncate' },
        axisLine: { lineStyle: { color: axis } },
      },
      series: [
        {
          type: 'bar',
          data: items.map((n, i) => ({
            value: Math.round(n.sec * 10) / 10,
            itemStyle: { color: palette[(items.length - 1 - i) % palette.length], borderRadius: 3 },
            cursor: n.children?.length ? 'pointer' : 'default',
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (p: { value: number }) => formatDuration(p.value),
          },
          barMaxWidth: 22,
        },
      ],
    };
  }, [children, palette, axis, total]);

  const childLevel = children[0]?.level;

  return (
    <div>
      <Breadcrumbs separatorMargin={6} mb="sm" style={{ flexWrap: 'wrap' }}>
        {nodes.map((n, i) =>
          i === nodes.length - 1 ? (
            <Text key={n.id} size="sm" fw={600}>
              {i === 0 ? '全体' : n.label}
            </Text>
          ) : (
            <Anchor
              key={n.id}
              size="sm"
              component="button"
              onClick={() => setPath(nodes.slice(1, i + 1).map((x) => x.id))}
            >
              {i === 0 ? '全体' : n.label}
            </Anchor>
          ),
        )}
      </Breadcrumbs>
      <Text size="sm" c="dimmed" mb="xs">
        {LEVEL_LABEL[current.level]}「{current.label}」 合計 {formatDuration(current.sec)}
        {childLevel && ` ・ ${LEVEL_LABEL[childLevel]}ごとの内訳`}
        {childLevel && childLevel !== 'sentence' && '(棒を押すと詳しく見られます)'}
      </Text>
      {children.length > 0 ? (
        <EChart
          option={option}
          height={Math.max(160, children.length * 34 + 24)}
          onClick={(e) => drill([...children].reverse()[e.dataIndex])}
        />
      ) : (
        <Text size="sm" c="dimmed">
          内訳はありません。
        </Text>
      )}
      <Table.ScrollContainer minWidth={320} mt="sm">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{childLevel ? LEVEL_LABEL[childLevel] : ''}</Table.Th>
              <Table.Th ta="right">時間</Table.Th>
              <Table.Th ta="right">割合</Table.Th>
              <Table.Th ta="right">{ctx.estimator.unitLabel}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {children.map((n) => (
              <Table.Tr key={n.id}>
                <Table.Td maw={260}>
                  {n.children?.length ? (
                    <Anchor component="button" size="sm" onClick={() => drill(n)} ta="left">
                      {n.label}
                    </Anchor>
                  ) : (
                    <Text size="sm">{n.label}</Text>
                  )}
                </Table.Td>
                <Table.Td ta="right">{formatDuration(n.sec)}</Table.Td>
                <Table.Td ta="right">{Math.round((n.sec / total) * 100)}%</Table.Td>
                <Table.Td ta="right">{Math.round(n.units)}</Table.Td>
                <Table.Td w={40}>
                  {n.blockId && (
                    <Tooltip label="エディタで開く">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => ctx.openInEditor(n.blockId!)}
                        aria-label="エディタで開く"
                      >
                        <IconArrowUpRight size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </div>
  );
}

/** AI に渡す要約(深さを段落までに抑える) */
function summarizeTree(n: TimeNode, depth: number): unknown {
  return {
    level: n.level,
    label: n.label,
    sec: Math.round(n.sec * 10) / 10,
    ...(depth > 0 && n.children?.length
      ? { children: n.children.map((c) => summarizeTree(c, depth - 1)) }
      : {}),
  };
}

export const timeDrilldownTool: AnalysisTool = {
  id: 'time-drilldown',
  title: '時間の内訳',
  description: '全体 → セクション → 段落 → 文と掘り下げて、どこに時間を使っているかを見ます。',
  icon: IconSitemap,
  component: TimeDrilldown,
  summarize: (ctx) => summarizeTree(ctx.tree, 2),
};
