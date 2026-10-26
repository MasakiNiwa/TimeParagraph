import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowUp,
  IconCheck,
  IconMessagePlus,
  IconPlayerStopFilled,
  IconSparkles,
  IconTool,
} from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { useAnalysisContext } from '@/features/analysis/useAnalysisContext';
import { useSettings, useSettingsStore } from '@/features/settings/settingsStore';
import { resetChat, useAiStore, type ChatItem } from './aiStore';
import { useApiKeyStore } from './apiKeys';
import { ModelPicker } from './ModelPicker';
import { quickPrompts } from './prompt';
import { ProposalCard } from './ProposalCard';
import { aiProviders, type AiProviderId } from './providers';
import { sendMessage, stopGenerating } from './runChat';
import { toolLabels } from './tools';
import classes from './AiPage.module.css';

function SetupGuide({ providerLabel }: { providerLabel: string }) {
  return (
    <Card withBorder padding="lg" m="auto" maw={520}>
      <Stack gap="sm">
        <Group gap="xs">
          <IconSparkles size={20} />
          <Text fw={600}>{providerLabel} の API キーが未設定です</Text>
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

/** 会話がないときの画面。よく使う依頼をカードで並べる */
function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <Stack gap="md" py="lg" maw={640} mx="auto" w="100%">
      <Stack gap={6} align="center">
        <ThemeIcon size={44} radius="xl" variant="light">
          <IconSparkles size={24} />
        </ThemeIcon>
        <Text fw={600} size="lg">
          原稿について相談する
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          AI
          は原稿の状態(段落・推定時間・目標・分析結果)を受け取り、時間の計算はアプリの機能を使って行います。
          原稿の変更は編集案として表示され、適用するかはあなたが決めます。
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
        {quickPrompts.map((q) => (
          <UnstyledButton
            key={q.label}
            className={classes.suggestion}
            onClick={() => onPick(q.prompt)}
          >
            <Text size="sm" fw={600}>
              {q.label}
            </Text>
            <Text size="xs" c="dimmed" lineClamp={2}>
              {q.prompt}
            </Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function Message({ item }: { item: ChatItem }) {
  if (item.role === 'user') return <div className={classes.user}>{item.text}</div>;
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <ThemeIcon size={28} radius="xl" variant="light" style={{ flexShrink: 0 }}>
        <IconSparkles size={16} />
      </ThemeIcon>
      <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
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
        {item.text ? (
          <div className={classes.assistant}>
            <Markdown>{item.text}</Markdown>
          </div>
        ) : (
          !item.error && item.tools.length === 0 && <Loader size="sm" type="dots" />
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
    </Group>
  );
}

/** 上部のバー: AI サービスとモデルをその場で切り替える */
function ChatToolbar({ canReset }: { canReset: boolean }) {
  const settings = useSettings();
  const update = useSettingsStore((s) => s.update);
  const keys = useApiKeyStore((s) => s.keys);
  return (
    <Group gap="xs" wrap="nowrap" className={classes.toolbar}>
      <Select
        size="xs"
        w={104}
        value={settings.ai.provider}
        onChange={(v) => v && update({ ai: { provider: v as AiProviderId } })}
        data={Object.values(aiProviders).map((p) => ({
          value: p.id,
          label: `${p.label.split(' ').pop()}${keys[p.id] ? '' : '(未設定)'}`,
        }))}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
        aria-label="AI サービス"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <ModelPicker size="xs" />
      </div>
      <Tooltip label="新しい会話">
        <ActionIcon
          variant="default"
          size={30}
          onClick={resetChat}
          disabled={!canReset}
          aria-label="新しい会話"
        >
          <IconMessagePlus size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

export function AiPage() {
  const ctx = useAnalysisContext();
  const settings = useSettings();
  const provider = aiProviders[settings.ai.provider];
  const hasKey = useApiKeyStore((s) => Boolean(s.keys[provider.id]));
  const { items, busy } = useAiStore();
  const [input, setInput] = useState('');
  // タッチ端末では Enter を改行にし、送信ボタンで送る
  const touch = useMediaQuery('(pointer: coarse)');
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const viewport = useRef<HTMLDivElement>(null);

  // 新しい発言・応答のたびに末尾までスクロールする
  const last = items[items.length - 1];
  const lastLen =
    (last?.text.length ?? 0) + (last?.tools.length ?? 0) + (last?.proposalIds.length ?? 0);
  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [items.length, lastLen]);

  if (!ctx) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy || !hasKey) return;
    setInput('');
    void sendMessage(t, () => ctxRef.current);
  };

  return (
    <div className={classes.page}>
      <ChatToolbar canReset={items.length > 0} />
      <ScrollArea className={classes.scroll} viewportRef={viewport} type="auto" offsetScrollbars>
        <div className={classes.messages}>
          {!hasKey ? (
            <SetupGuide providerLabel={provider.label} />
          ) : items.length === 0 ? (
            <EmptyState onPick={send} />
          ) : (
            items.map((item) => <Message key={item.id} item={item} />)
          )}
        </div>
      </ScrollArea>
      {hasKey && (
        <div className={classes.composer}>
          {items.length > 0 && (
            <ScrollArea type="never" mb={6}>
              <Group gap={6} wrap="nowrap">
                {quickPrompts.map((q) => (
                  <Button
                    key={q.label}
                    size="compact-xs"
                    variant="default"
                    radius="xl"
                    onClick={() => send(q.prompt)}
                    disabled={busy}
                    style={{ flexShrink: 0 }}
                  >
                    {q.label}
                  </Button>
                ))}
              </Group>
            </ScrollArea>
          )}
          <div className={classes.inputBox}>
            <Textarea
              variant="unstyled"
              autosize
              minRows={2}
              maxRows={10}
              placeholder={
                touch ? 'AI に相談する…' : 'AI に相談する…(Enter で送信、Shift+Enter で改行)'
              }
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !touch && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              classNames={{ input: classes.input }}
              aria-label="メッセージ"
            />
            <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed" truncate>
                {provider.label.split(' ').pop()} ・ {settings.ai[provider.modelSetting]}
              </Text>
              {busy ? (
                <Tooltip label="中断">
                  <ActionIcon
                    size="lg"
                    radius="xl"
                    variant="default"
                    onClick={stopGenerating}
                    aria-label="中断"
                  >
                    <IconPlayerStopFilled size={16} />
                  </ActionIcon>
                </Tooltip>
              ) : (
                <ActionIcon
                  size="lg"
                  radius="xl"
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  aria-label="送信"
                >
                  <IconArrowUp size={18} />
                </ActionIcon>
              )}
            </Group>
          </div>
        </div>
      )}
    </div>
  );
}
