import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
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
  IconBulb,
  IconChevronDown,
  IconChevronUp,
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
import { effortLabels } from './effort';
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

/** 応答中は 1 秒ごとに再描画して経過時間を表示する */
function useElapsed(startedAt: number, active: boolean, finishedAt?: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return Math.max(0, Math.round(((finishedAt ?? now) - startedAt) / 1000));
}

const PHASE_LABEL: Record<ChatItem['phase'], string> = {
  waiting: '考えています',
  thinking: '考えています',
  tool: 'アプリの機能を使っています',
  answering: '回答を書いています',
  done: '',
};

/** 思考過程。考えている間は開いて流れを見せ、終わったら折りたたむ */
function Reasoning({ item, elapsed }: { item: ChatItem; elapsed: number }) {
  const live = item.phase === 'thinking';
  const [opened, setOpened] = useState(false);
  const show = live || opened;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (live) box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [item.reasoning, live]);
  if (!item.reasoning) return null;
  return (
    <div className={classes.reasoning}>
      <UnstyledButton onClick={() => setOpened((o) => !o)} className={classes.reasoningToggle}>
        <Group gap={6} wrap="nowrap">
          <IconBulb size={14} />
          <Text size="xs" c="dimmed">
            {live ? '思考中…' : `思考過程(${elapsed}秒)`}
          </Text>
          {show ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </Group>
      </UnstyledButton>
      <Collapse in={show}>
        <div ref={box} className={classes.reasoningBody} data-live={live || undefined}>
          <Markdown>{item.reasoning}</Markdown>
        </div>
      </Collapse>
    </div>
  );
}

/**
 * 届いた本文を、行のまとまり(空行区切り)ごとに上から下へふわっと表示する。
 * 受信中は書きかけの行を出さず、完成した行までを表示する(表示を遅らせる処理はしない)。
 */
function StreamingMarkdown({ text, streaming }: { text: string; streaming: boolean }) {
  const visible = streaming ? text.slice(0, text.lastIndexOf('\n') + 1) : text;
  const blocks = visible.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className={classes.assistant}>
      {blocks.map((b, i) => (
        // key を位置で固定し、新しく増えたまとまりだけがアニメーションする
        <div key={i} className={classes.reveal}>
          <Markdown>{b}</Markdown>
        </div>
      ))}
      {streaming && <Loader size="xs" type="dots" mt={4} />}
    </div>
  );
}

const sec = (ms: number) => `${Math.max(0, Math.round(ms / 1000))}秒`;

/**
 * 所要時間の内訳。AI サービスの応答待ち(混雑など)と、モデルが考えている時間を分けて表示し、
 * 遅いときの原因を切り分けられるようにする
 */
function StepTimings({ item }: { item: ChatItem }) {
  const [opened, setOpened] = useState(false);
  if (item.steps.length === 0) return null;
  const now = Date.now();
  return (
    <div>
      <UnstyledButton onClick={() => setOpened((o) => !o)}>
        <Group gap={4}>
          <Text size="xs" c="dimmed">
            所要時間の内訳({item.steps.length} 回の呼び出し)
          </Text>
          {opened ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
        </Group>
      </UnstyledButton>
      <Collapse in={opened}>
        <Stack gap={2} mt={4}>
          {item.steps.map((st, i) => {
            const end = st.endedAt ?? now;
            const first = st.firstChunkAt ?? end;
            const out = st.firstOutputAt ?? end;
            return (
              <Text key={i} size="xs" c="dimmed" className={classes.timing}>
                {i + 1}. 応答待ち {sec(first - st.startedAt)} ・ 思考 {sec(out - first)} ・ 出力{' '}
                {sec(end - out)}
                {st.tools.length > 0 && ` → ${st.tools.map((t) => toolLabels[t] ?? t).join('、')}`}
                {!st.endedAt && '(実行中)'}
              </Text>
            );
          })}
          <Text size="xs" c="dimmed">
            「応答待ち」は最初のデータが届くまでの時間で、AI
            サービス側の混雑と、モデルが考えている時間(考え終わってからまとめて送るモデルの場合)の両方を含みます。長い場合は、軽いモデル(flash-lite
            など)をお試しください。
          </Text>
        </Stack>
      </Collapse>
    </div>
  );
}

function Message({ item }: { item: ChatItem }) {
  const active = item.phase !== 'done';
  const elapsed = useElapsed(item.startedAt, active && item.role === 'assistant', item.finishedAt);
  if (item.role === 'user') return <div className={classes.user}>{item.text}</div>;
  const runningTool = [...item.tools].reverse().find((t) => t.status === 'running');
  const failedTools = item.tools.filter((t) => t.status === 'error' && t.message);
  const empty = !active && !item.text && !item.error && item.proposalIds.length === 0;
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <ThemeIcon size={28} radius="xl" variant="light" style={{ flexShrink: 0 }}>
        <IconSparkles size={16} />
      </ThemeIcon>
      <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
        {active && item.phase !== 'answering' && (
          <Group gap={8} wrap="nowrap" className={classes.status}>
            <Loader size={14} type="dots" />
            <Text size="sm" c="dimmed">
              {PHASE_LABEL[item.phase]}
              {runningTool && `:${toolLabels[runningTool.name] ?? runningTool.name}`}{' '}
              <span className={classes.elapsed}>{elapsed}秒</span>
            </Text>
          </Group>
        )}
        <Reasoning item={item} elapsed={elapsed} />
        {item.tools.length > 0 && (
          <Group gap={4}>
            {item.tools.map((t, i) => (
              <Tooltip key={i} label={t.message} disabled={!t.message} multiline maw={280}>
                <Badge
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
                  {t.status === 'error' && '(失敗)'}
                </Badge>
              </Tooltip>
            ))}
          </Group>
        )}
        {failedTools.length > 0 && (
          <Text size="xs" c="dimmed">
            {failedTools.map((t) => `${toolLabels[t.name] ?? t.name}: ${t.message}`).join(' / ')}
          </Text>
        )}
        {item.text && <StreamingMarkdown text={item.text} streaming={active} />}
        {item.proposalIds.map((id) => (
          <ProposalCard key={id} id={id} />
        ))}
        {empty && (
          <Text size="sm" c="dimmed">
            (回答がありませんでした。もう一度お試しいただくか、別のモデルを選んでください)
          </Text>
        )}
        {item.error && (
          <Alert color="orange" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="sm">{item.error}</Text>
          </Alert>
        )}
        {!active && (item.text || item.proposalIds.length > 0) && (
          <Text size="xs" c="dimmed">
            {elapsed}秒
          </Text>
        )}
        <StepTimings item={item} />
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
  const updateSettings = useSettingsStore((s) => s.update);
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
              <Tooltip label="考える深さ(深いほど丁寧ですが時間がかかります)">
                <SegmentedControl
                  size="xs"
                  value={settings.ai.effort}
                  onChange={(v) =>
                    updateSettings({ ai: { effort: v as typeof settings.ai.effort } })
                  }
                  data={Object.entries(effortLabels).map(([value, label]) => ({ value, label }))}
                  aria-label="考える深さ"
                  disabled={busy}
                />
              </Tooltip>
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
