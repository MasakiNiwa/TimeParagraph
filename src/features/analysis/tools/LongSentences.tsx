import { Anchor, Group, Slider, Stack, Text } from '@mantine/core';
import { IconRuler2 } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { findLongSentences } from '@/domain/analysis';
import type { AnalysisContext, AnalysisTool } from '../types';

const DEFAULT_THRESHOLD = 80;

function LongSentences({ ctx }: { ctx: AnalysisContext }) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const list = useMemo(
    () => findLongSentences(ctx.doc, ctx.estimator, threshold),
    [ctx.doc, ctx.estimator, threshold],
  );
  const unit = ctx.estimator.unitLabel;
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        話し言葉では、一文が長いと聞き手が理解しにくくなります。しきい値を超える文を表示します。
      </Text>
      <Group gap="sm" wrap="nowrap">
        <Text size="sm" w={110}>
          {threshold} {unit} 超
        </Text>
        <Slider
          flex={1}
          min={30}
          max={200}
          step={10}
          value={threshold}
          onChange={setThreshold}
          label={null}
          aria-label="しきい値"
        />
      </Group>
      {list.length === 0 ? (
        <Text size="sm">長い文はありません。</Text>
      ) : (
        list.map((s, i) => (
          <div key={`${s.blockId}-${i}`}>
            <Anchor
              size="sm"
              component="button"
              ta="left"
              onClick={() => ctx.openInEditor(s.blockId)}
            >
              {s.text}
            </Anchor>
            <Text size="xs" c="dimmed">
              {Math.round(s.units)} {unit}
            </Text>
          </div>
        ))
      )}
    </Stack>
  );
}

export const longSentencesTool: AnalysisTool = {
  id: 'long-sentences',
  title: '長い文',
  description: '一息で話すには長い文を見つけます。',
  icon: IconRuler2,
  component: LongSentences,
  summarize: (ctx) =>
    findLongSentences(ctx.doc, ctx.estimator, DEFAULT_THRESHOLD).map((s) => ({
      text: s.text,
      units: Math.round(s.units),
    })),
};
