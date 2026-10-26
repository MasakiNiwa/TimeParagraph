import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconPlayerStopFilled,
  IconSend,
  IconSparkles,
  IconTrash,
  IconTool,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/PageContainer';
import { useAnalysisContext } from '@/features/analysis/useAnalysisContext';
import { useSettings } from '@/features/settings/settingsStore';
import { resetChat, useAiStore, type ChatItem } from './aiStore';
import { useApiKeyStore } from './apiKeys';
import { quickPrompts } from './prompt';
import { ProposalCard } from './ProposalCard';
import { aiProviders } from './providers';
import { sendMessage, stopGenerating } from './runChat';
import { toolLabels } from './tools';
import classes from './AiPage.module.css';

function SetupGuide() {
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <IconSparkles size={20} />
          <Text fw={600}>AI アシスタントを使うには</Text>
        </Group>
        <Text size="sm">
          AI は任意の機能です。使わなくても、エディタ・練習・分析はすべて利用できます。
        </Text>
        <Text size="sm">
          「設定 → AI」で API
          キーを登録すると、原稿の講評や、目標時間に合わせた短縮案などを依頼できます。
          まずは無料枠のある Google AI Studio(Gemini)がおすすめです。
        </Text>
        <Group>
          <Button component={Link} to="/settings" variant="light">
            設定を開く
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function Message({ item }: { item: ChatItem }) {
  if (item.role === 'user') return <div className={classes.user}>{item.text}</div>;
  return (
    <Stack gap={6}>
      {item.tools.length > 0 && (
        <Group gap={4}>
          {item.tools.map((t, i) => (
            <Badge
              key={i}
              size="sm"
              variant="outline"
              color={t.status === 'error' ? 'orange' : 'gray'}
              tt="none"
              leftSection={
                t.status === 'running' ? (
                  <Loader size={10} />
                ) : t.status === 'done' ? (
                  <IconCheck size={12} />
                ) : (
                  <IconTool size={12} />
                )
              }
            >
              {toolLabels[t.name] ?? t.name}
            </Badge>
          ))}
        </Group>
      )}
      {item.text && (
        <div className={classes.assistant}>
          <Markdown>{item.text}</Markdown>
        </div>
      )}
      {item.proposalIds.map((id) => (
        <ProposalCard key={id} id={id} />
      ))}
      {item.error && (
        <Alert color="orange" icon={<IconAlertTriangle size={16} />} p="xs">
          <Text size="sm">{item.error}</Text>
        </Alert>
      )}
    </Stack>
  );
}

export function AiPage() {
  const ctx = useAnalysisContext();
  const settings = useSettings();
  const provider = aiProviders[settings.ai.provider];
  const hasKey = useApiKeyStore((s) => Boolean(s.keys[provider.id]));
  const { items, busy } = useAiStore();
  const [input, setInput] = useState('');
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastText = items[items.length - 1]?.text;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [items.length, lastText]);

  if (!ctx) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');
    void sendMessage(t, () => ctxRef.current);
  };

  return (
    <PageContainer title="AI アシスタント">
      {!hasKey ? (
        <SetupGuide />
      ) : (
        <>
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              {provider.label} ・ {settings.ai[provider.modelSetting]}
            </Text>
            {items.length > 0 && (
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                leftSection={<IconTrash size={14} />}
                onClick={resetChat}
              >
                会話をリセット
              </Button>
            )}
          </Group>
          {items.length === 0 && (
            <Text size="sm" c="dimmed">
              AI
              は原稿の状態(段落・推定時間・目標・分析結果)を構造化データとして受け取り、アプリの計算機能を
              ツールとして使いながら提案します。原稿の変更は提案として表示され、適用するかはあなたが決めます。
            </Text>
          )}
          <div className={classes.messages}>
            {items.map((item) => (
              <Message key={item.id} item={item} />
            ))}
            {busy && items[items.length - 1]?.text === '' && <Loader size="sm" type="dots" />}
            <div ref={bottomRef} />
          </div>
          <div className={classes.composer}>
            <Stack gap={8}>
              <ScrollArea type="never">
                <Group gap={6} wrap="nowrap">
                  {quickPrompts.map((q) => (
                    <Chip
                      key={q.label}
                      size="xs"
                      variant="outline"
                      checked={false}
                      onClick={() => send(q.prompt)}
                      disabled={busy}
                    >
                      {q.label}
                    </Chip>
                  ))}
                </Group>
              </ScrollArea>
              <Group gap="xs" wrap="nowrap" align="flex-end">
                <Textarea
                  flex={1}
                  autosize
                  minRows={1}
                  maxRows={6}
                  placeholder="AI に相談する…(Ctrl+Enter で送信)"
                  value={input}
                  onChange={(e) => setInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      (e.ctrlKey || e.metaKey) &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  aria-label="メッセージ"
                />
                {busy ? (
                  <Tooltip label="中断">
                    <ActionIcon
                      size="lg"
                      variant="default"
                      onClick={stopGenerating}
                      aria-label="中断"
                    >
                      <IconPlayerStopFilled size={18} />
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <ActionIcon
                    size="lg"
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    aria-label="送信"
                  >
                    <IconSend size={18} />
                  </ActionIcon>
                )}
              </Group>
            </Stack>
          </div>
        </>
      )}
    </PageContainer>
  );
}
