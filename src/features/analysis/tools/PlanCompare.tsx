import { Anchor, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconChartBarPopular } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '@/domain/format';
import { planRows, planStatus, type PlanRow } from '@/domain/plan';
import { escapeHtml } from '@/lib/escapeHtml';
import { EChart, useChartColors, type EChartsOption } from '@/components/EChart';
import { usePlanModal } from '@/features/editor/editorUiStore';
import type { AnalysisContext, AnalysisTool } from '../types';

const STATUS_LABEL = { over: '長い', under: '短い', ok: '計画どおり' } as const;
const STATUS_COLOR = { over: 'orange', under: 'blue', ok: 'teal' } as const;

const plannedRows = (ctx: AnalysisContext) =>
  planRows(ctx.doc.blocks, ctx.estimate).filter(
    (r): r is PlanRow & { targetSec: number } => r.targetSec !== null,
  );

function PlanCompare({ ctx }: { ctx: AnalysisContext }) {
  const navigate = useNavigate();
  const rows = useMemo(() => plannedRows(ctx), [ctx]);
  const { palette, axis } = useChartColors();

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
      legend: { top: 0, data: ['計画', '推定'] },
      tooltip: {
        trigger: 'axis',
        formatter: (ps: { dataIndex: number }[]) => {
          const r = rows[ps[0]?.dataIndex ?? 0];
          if (!r) return '';
          return `${escapeHtml(r.label)}<br/>計画 ${formatDuration(r.targetSec)} / 推定 ${formatDuration(r.actualSec)}`;
        },
      },
      xAxis: {
        type: 'value',
        splitNumber: 4,
        axisLabel: { formatter: (v: number) => formatDuration(v), hideOverlap: true },
        splitLine: { lineStyle: { color: axis } },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: rows.map((r) => (r.label.length > 10 ? `${r.label.slice(0, 10)}…` : r.label)),
        axisLine: { lineStyle: { color: axis } },
      },
      series: [
        {
          name: '計画',
          type: 'bar',
          data: rows.map((r) => r.targetSec),
          itemStyle: { color: palette[1], opacity: 0.6, borderRadius: [0, 3, 3, 0] },
          barMaxWidth: 14,
        },
        {
          name: '推定',
          type: 'bar',
          data: rows.map((r) => Math.round(r.actualSec * 10) / 10),
          itemStyle: { color: palette[0], borderRadius: [0, 3, 3, 0] },
          barMaxWidth: 14,
        },
      ],
    }),
    [rows, palette, axis],
  );

  const openPlanner = () => {
    navigate('/');
    usePlanModal.setState({ opened: true });
  };

  if (rows.length === 0)
    return (
      <Stack gap="sm" align="flex-start">
        <Text size="sm" c="dimmed">
          まだ時間配分の計画がありません。セクションや段落ごとに「何分話すか」を決めておくと、推定とのずれをここで確認できます。
        </Text>
        <Button variant="light" size="xs" onClick={openPlanner}>
          時間配分を計画する
        </Button>
      </Stack>
    );

  const off = rows.filter((r) => planStatus(r.actualSec, r.targetSec) !== 'ok');
  return (
    <Stack gap="sm">
      <EChart
        option={option}
        height={Math.max(160, rows.length * 44 + 50)}
        onClick={(e) => ctx.openInEditor(rows[e.dataIndex].id)}
      />
      {off.length === 0 ? (
        <Text size="sm" c="dimmed">
          すべて計画どおりです(差が 10% または 5 秒以内)。
        </Text>
      ) : (
        <Stack gap={4}>
          {off.map((r) => {
            const status = planStatus(r.actualSec, r.targetSec);
            const diff = r.actualSec - r.targetSec;
            return (
              <Group key={r.id} gap="xs" wrap="nowrap">
                <Badge
                  size="sm"
                  variant="light"
                  color={STATUS_COLOR[status]}
                  tt="none"
                  style={{ flexShrink: 0 }}
                >
                  {STATUS_LABEL[status]}
                </Badge>
                <Anchor size="sm" component="button" onClick={() => ctx.openInEditor(r.id)}>
                  {r.label}
                </Anchor>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {diff > 0 ? '+' : '−'}
                  {formatDuration(Math.abs(diff))}
                </Text>
              </Group>
            );
          })}
        </Stack>
      )}
      <Group>
        <Button variant="subtle" size="compact-xs" onClick={openPlanner}>
          計画を編集
        </Button>
      </Group>
    </Stack>
  );
}

export const planCompareTool: AnalysisTool = {
  id: 'plan-compare',
  title: '計画と実際',
  description: 'セクション・段落ごとの計画時間と、今の原稿の推定時間を比べます。',
  icon: IconChartBarPopular,
  component: PlanCompare,
  summarize: (ctx) =>
    plannedRows(ctx).map((r) => ({
      label: r.label,
      kind: r.kind,
      targetSec: r.targetSec,
      estimatedSec: Math.round(r.actualSec),
      status: planStatus(r.actualSec, r.targetSec),
    })),
};
