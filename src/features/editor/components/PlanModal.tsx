import { Alert, Button, Group, Modal, ScrollArea, Stack, Table, Text } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { formatDuration, parseDuration } from '@/domain/format';
import { distribute, planRows, planStatus, type DistributeMode } from '@/domain/plan';
import { useDocumentStore } from '../documentStore';
import { useEstimate } from '../useEstimate';
import { DurationInput, PLAN_COLORS } from './PlanTarget';

const MODES: { mode: DistributeMode; label: string; description: string }[] = [
  { mode: 'even', label: '均等', description: 'すべて同じ長さ' },
  { mode: 'current', label: '今の長さの比率', description: '今の原稿の長さの比率のまま' },
  {
    mode: 'role',
    label: 'タイプの目安',
    description: '具体例・説明は長め、つなぎ・予告は短めなど、段落のタイプから',
  },
];

/** 時間配分の計画。全体の目標時間をセクション(または段落)に割り振る */
export function PlanModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const doc = useDocumentStore((s) => s.doc);
  const { estimate } = useEstimate();
  const rows = useMemo(() => (doc ? planRows(doc.blocks, estimate) : []), [doc, estimate]);
  const [total, setTotal] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  // 開いたときに、今の計画を入力欄へ読み込む
  useEffect(() => {
    if (!opened || !doc) return;
    const t = doc.targetDurationSec ?? Math.ceil(estimate.totalSec / 60) * 60;
    setTotal(t > 0 ? formatDuration(t) : '');
    setValues(
      Object.fromEntries(
        planRows(doc.blocks, estimate).map((r) => [
          r.id,
          r.targetSec === null ? '' : formatDuration(r.targetSec),
        ]),
      ),
    );
    // 開いたときだけ読み込む(編集中に推定が変わっても入力を消さない)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  if (!doc) return null;
  const totalSec = parseDuration(total);
  const parsed = rows.map((r) => parseDuration(values[r.id] ?? ''));
  const planned = parsed.reduce<number>((a, b) => a + (b ?? 0), 0);
  const invalid = rows.some((r, i) => (values[r.id] ?? '').trim() !== '' && parsed[i] === null);

  const fill = (mode: DistributeMode) => {
    if (!totalSec) return;
    const secs = distribute(totalSec, rows, mode);
    setValues(Object.fromEntries(rows.map((r, i) => [r.id, formatDuration(secs[i])])));
  };
  const save = () => {
    useDocumentStore
      .getState()
      .setPlan(
        Object.fromEntries(rows.map((r, i) => [r.id, parsed[i]])),
        totalSec ?? doc.targetDurationSec,
      );
    onClose();
  };
  const clearAll = () => setValues(Object.fromEntries(rows.map((r) => [r.id, ''])));

  return (
    <Modal opened={opened} onClose={onClose} title="時間配分を計画" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          全体の目標時間を、
          {rows.some((r) => r.kind === 'section') ? 'セクション' : '段落'}
          ごとに割り振ります。エディタでは「推定 /
          計画」が表示され、長すぎるとオレンジ、短すぎると青になります。
        </Text>
        <Group gap="xs" align="flex-end">
          <DurationInput label="全体の目標時間" value={total} onChange={setTotal} w={140} />
          <Text size="xs" c="dimmed" pb={8}>
            今の推定 {formatDuration(estimate.totalSec)}
          </Text>
        </Group>
        <div>
          <Text size="sm" fw={500} mb={4}>
            自動で割り振る
          </Text>
          <Group gap={6}>
            {MODES.map((m) => (
              <Button
                key={m.mode}
                size="compact-sm"
                variant="light"
                disabled={!totalSec}
                onClick={() => fill(m.mode)}
                title={m.description}
              >
                {m.label}
              </Button>
            ))}
          </Group>
        </div>
        {rows.length === 0 ? (
          <Alert color="gray">段落がありません。</Alert>
        ) : (
          <ScrollArea.Autosize mah="45vh" type="auto">
            <Table verticalSpacing={4} horizontalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    {rows.some((r) => r.kind === 'section') ? 'セクション' : '段落'}
                  </Table.Th>
                  <Table.Th ta="right">推定</Table.Th>
                  <Table.Th>計画</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r, i) => {
                  const p = parsed[i];
                  const status = p !== null ? planStatus(r.actualSec, p) : null;
                  return (
                    <Table.Tr key={r.id}>
                      <Table.Td>
                        <Text size="sm" lineClamp={1}>
                          {r.label}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text
                          size="sm"
                          c={status ? `${PLAN_COLORS[status]}.6` : 'dimmed'}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatDuration(r.actualSec)}
                        </Text>
                      </Table.Td>
                      <Table.Td w={110}>
                        <DurationInput
                          size="xs"
                          value={values[r.id] ?? ''}
                          onChange={(v) => setValues((s) => ({ ...s, [r.id]: v }))}
                          aria-label={`${r.label} の計画時間`}
                        />
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}
        <Group justify="space-between" gap="xs">
          <Text
            size="sm"
            c={totalSec && Math.abs(planned - totalSec) > 1 ? 'orange.6' : 'dimmed'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            計画の合計 {formatDuration(planned)}
            {totalSec ? ` / 目標 ${formatDuration(totalSec)}` : ''}
          </Text>
          <Group gap="xs">
            <Button variant="subtle" color="gray" size="xs" onClick={clearAll}>
              すべて外す
            </Button>
            <Button variant="default" size="xs" onClick={onClose}>
              キャンセル
            </Button>
            <Button size="xs" onClick={save} disabled={invalid}>
              保存
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
