import { Anchor, Badge, Button, CopyButton, Group, Paper, Stack, Text } from '@mantine/core';
import { IconListDetails } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '@/domain/format';
import {
  checkParagraphs,
  PW_ISSUE_HINTS,
  PW_ISSUE_LABELS,
  skimText,
  type PwIssueKind,
} from '@/domain/paragraphWriting';
import { setView } from '@/features/editor/editorUiStore';
import type { AnalysisContext, AnalysisTool } from '../types';

/** タイトル未設定は、構造の問題というより「書いておくとよい」ヒント */
const isHint = (k: PwIssueKind) => k === 'no-title';

function ParagraphStructure({ ctx }: { ctx: AnalysisContext }) {
  const navigate = useNavigate();
  const checks = useMemo(() => checkParagraphs(ctx.doc.blocks, ctx.estimate), [ctx]);
  const skim = useMemo(() => skimText(ctx.doc.blocks), [ctx]);

  if (checks.length === 0) return <Text c="dimmed">段落がありません。</Text>;

  const problems = checks.filter((c) => c.issues.some((k) => !isHint(k)));
  const untitled = checks.filter((c) => c.issues.includes('no-title')).length;
  const used = [...new Set(problems.flatMap((c) => c.issues.filter((k) => !isHint(k))))];

  return (
    <Stack gap="md">
      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm" fw={600}>
            縦読み(要点だけを順に読む)
          </Text>
          <Group gap={4}>
            <CopyButton value={skim}>
              {({ copied, copy }) => (
                <Button size="compact-xs" variant="subtle" onClick={copy}>
                  {copied ? 'コピーしました' : 'コピー'}
                </Button>
              )}
            </CopyButton>
            <Button
              size="compact-xs"
              variant="light"
              onClick={() => {
                setView('outline');
                navigate('/');
              }}
            >
              エディタで要点表示
            </Button>
          </Group>
        </Group>
        <Paper withBorder p="sm" radius="md">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {skim}
          </Text>
        </Paper>
        <Text size="xs" c="dimmed" mt={4}>
          タイトルがある段落はタイトルを、ない段落は最初の文を表示しています。これだけを読んで話の筋が通るのが理想です。
        </Text>
      </div>

      <div>
        <Text size="sm" fw={600} mb={4}>
          段落の点検
        </Text>
        {problems.length === 0 ? (
          <Text size="sm" c="dimmed">
            構造の目安から外れた段落はありません。
          </Text>
        ) : (
          <Stack gap={6}>
            {problems.map((c) => (
              <Group key={c.blockId} gap="xs" wrap="nowrap" align="flex-start">
                <Group gap={4} style={{ flexShrink: 0 }} w={130}>
                  {c.issues
                    .filter((k) => !isHint(k))
                    .map((k) => (
                      <Badge key={k} size="sm" variant="light" color="orange" tt="none">
                        {PW_ISSUE_LABELS[k]}
                      </Badge>
                    ))}
                </Group>
                <div style={{ minWidth: 0 }}>
                  <Anchor
                    size="sm"
                    component="button"
                    onClick={() => ctx.openInEditor(c.blockId)}
                    ta="left"
                  >
                    段落{c.index}: {c.label}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    {c.sentenceCount} 文 ・ {formatDuration(c.sec)}
                  </Text>
                </div>
              </Group>
            ))}
          </Stack>
        )}
        {used.length > 0 && (
          <Stack gap={2} mt="xs">
            {used.map((k) => (
              <Text key={k} size="xs" c="dimmed">
                ・{PW_ISSUE_LABELS[k]}:{PW_ISSUE_HINTS[k]}
              </Text>
            ))}
          </Stack>
        )}
        {untitled > 0 && (
          <Text size="xs" c="dimmed" mt="xs">
            タイトル(要点)が未設定の段落が {untitled} 個あります。{PW_ISSUE_HINTS['no-title']}
          </Text>
        )}
      </div>
    </Stack>
  );
}

export const paragraphStructureTool: AnalysisTool = {
  id: 'paragraph-structure',
  title: 'パラグラフの構造',
  description:
    '1 段落 1 トピック・トピックセンテンスの観点で段落を点検し、要点だけを順に読む「縦読み」を表示します。',
  icon: IconListDetails,
  component: ParagraphStructure,
  summarize: (ctx) => {
    const checks = checkParagraphs(ctx.doc.blocks, ctx.estimate);
    return {
      skim: skimText(ctx.doc.blocks),
      issues: checks
        .filter((c) => c.issues.length > 0)
        .map((c) => ({
          // AI がブロックを指す ref(appState の blockRef と同じ形式)
          ref: `B${ctx.doc.blocks.findIndex((b) => b.id === c.blockId) + 1}`,
          issues: c.issues,
          sentenceCount: c.sentenceCount,
          topicSentence: c.topic,
        })),
    };
  },
};
