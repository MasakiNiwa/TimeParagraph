import {
  ActionIcon,
  Badge,
  Button,
  Chip,
  Drawer,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconRefresh, IconSearch, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchOpenRouterModelList, toggleFavorite, useModelListStore } from './modelList';
import {
  filterModels,
  formatContext,
  formatPrice,
  groupByVendor,
  type OpenRouterModel,
} from './openrouterModels';
import classes from './ModelBrowser.module.css';

type FilterKey = 'free' | 'tools' | 'reasoning';

function ModelRow({
  model,
  selected,
  favorite,
  onSelect,
}: {
  model: OpenRouterModel;
  selected: boolean;
  favorite: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={classes.row} data-selected={selected || undefined}>
      <UnstyledButton className={classes.main} onClick={() => onSelect(model.id)}>
        <Text size="sm" fw={600} lineClamp={1}>
          {model.name}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {model.id}
        </Text>
        <Group gap={4} mt={4} wrap="wrap">
          {model.free && (
            <Badge size="xs" color="teal" variant="light" tt="none">
              無料
            </Badge>
          )}
          {model.tools ? (
            <Badge size="xs" variant="light" tt="none">
              ツール
            </Badge>
          ) : (
            <Badge size="xs" color="orange" variant="light" tt="none">
              ツール非対応
            </Badge>
          )}
          {model.reasoning && (
            <Badge size="xs" color="grape" variant="light" tt="none">
              思考
            </Badge>
          )}
          <Text size="xs" c="dimmed" className={classes.meta}>
            {formatPrice(model)}
            {!model.free && model.promptPrice !== null && ' (100万トークン 入力/出力)'}
            {model.contextLength > 0 && ` ・ ${formatContext(model.contextLength)}`}
          </Text>
        </Group>
      </UnstyledButton>
      <ActionIcon
        variant="subtle"
        color={favorite ? 'yellow' : 'gray'}
        onClick={() => toggleFavorite(model.id)}
        aria-label={favorite ? 'お気に入りから外す' : 'お気に入りに追加'}
      >
        {favorite ? <IconStarFilled size={16} /> : <IconStar size={16} />}
      </ActionIcon>
    </div>
  );
}

/**
 * OpenRouter のモデル選択パネル。モデルが多いため、検索・絞り込み・お気に入り・最近使ったものを用意する。
 * スマホでは下から出るシート、PC ではダイアログで表示する。
 */
export function ModelBrowser({
  opened,
  onClose,
  value,
  onSelect,
}: {
  opened: boolean;
  onClose: () => void;
  value: string;
  onSelect: (id: string) => void;
}) {
  const mobile = useMediaQuery('(max-width: 48em)');
  const { openrouterModels, favorites, recents } = useModelListStore();
  const loading = useModelListStore((s) => Boolean(s.loading.openrouter));
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterKey[]>(['tools']);
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (opened) void fetchOpenRouterModelList({ silent: true });
  }, [opened]);

  const filtered = useMemo(
    () =>
      filterModels(openrouterModels, {
        query,
        freeOnly: filters.includes('free'),
        toolsOnly: filters.includes('tools'),
        reasoningOnly: filters.includes('reasoning'),
      }),
    [openrouterModels, query, filters],
  );
  const byId = useMemo(() => new Map(filtered.map((m) => [m.id, m])), [filtered]);
  const pinned = favorites.map((id) => byId.get(id)).filter((m): m is OpenRouterModel => !!m);
  const recent = recents
    .filter((id) => !favorites.includes(id))
    .map((id) => byId.get(id))
    .filter((m): m is OpenRouterModel => !!m);
  const groups = useMemo(() => groupByVendor(filtered), [filtered]);

  const select = (id: string) => {
    onSelect(id);
    onClose();
  };
  const row = (m: OpenRouterModel, keyPrefix: string) => (
    <ModelRow
      key={`${keyPrefix}-${m.id}`}
      model={m}
      selected={m.id === value}
      favorite={favorites.includes(m.id)}
      onSelect={select}
    />
  );

  const body = (
    <Stack gap="xs" className={classes.body}>
      <Group gap="xs" wrap="nowrap">
        <TextInput
          flex={1}
          leftSection={<IconSearch size={16} />}
          placeholder="モデルを検索(例: gemini flash)"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          data-autofocus={!mobile || undefined}
          aria-label="モデルを検索"
        />
        <Tooltip label="一覧を更新">
          <ActionIcon
            variant="default"
            size={36}
            onClick={() => void fetchOpenRouterModelList({ force: true })}
            loading={loading}
            aria-label="一覧を更新"
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Chip.Group multiple value={filters} onChange={(v) => setFilters(v as FilterKey[])}>
        <Group gap={6}>
          <Chip size="xs" value="free">
            無料のみ
          </Chip>
          <Chip size="xs" value="tools">
            ツール対応のみ
          </Chip>
          <Chip size="xs" value="reasoning">
            思考対応
          </Chip>
          <Text size="xs" c="dimmed">
            {filtered.length} 件
          </Text>
        </Group>
      </Chip.Group>
      <ScrollArea.Autosize mah={mobile ? '58dvh' : 460} type="auto" offsetScrollbars>
        {openrouterModels.length === 0 ? (
          <Group justify="center" p="lg">
            {loading ? <Loader size="sm" /> : <Text size="sm">一覧を取得できませんでした。</Text>}
          </Group>
        ) : filtered.length === 0 ? (
          <Text size="sm" c="dimmed" p="md">
            条件に合うモデルがありません。
          </Text>
        ) : (
          <Stack gap={4}>
            {pinned.length > 0 && (
              <>
                <Text className={classes.group}>★ お気に入り</Text>
                {pinned.map((m) => row(m, 'fav'))}
              </>
            )}
            {recent.length > 0 && (
              <>
                <Text className={classes.group}>最近使ったモデル</Text>
                {recent.map((m) => row(m, 'recent'))}
              </>
            )}
            {groups.map(([vendor, models]) => (
              <div key={vendor}>
                <Text className={classes.group}>{vendor}</Text>
                <Stack gap={4}>{models.map((m) => row(m, vendor))}</Stack>
              </div>
            ))}
          </Stack>
        )}
      </ScrollArea.Autosize>
      <Group gap="xs" wrap="nowrap" align="flex-end">
        <TextInput
          flex={1}
          size="xs"
          label="一覧にないモデルを直接指定"
          placeholder="例: google/gemini-3.5-flash"
          value={manual}
          onChange={(e) => setManual(e.currentTarget.value)}
        />
        <Button
          size="xs"
          variant="default"
          disabled={!manual.trim()}
          onClick={() => select(manual.trim())}
        >
          使う
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        アプリの機能(時間の計算や編集案の作成)を使うには「ツール」対応のモデルが必要です。無料モデルは利用回数の制限があり、提供元によっては入力内容が記録・学習に使われることがあります。
      </Text>
    </Stack>
  );

  return mobile ? (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="92%"
      title="OpenRouter のモデルを選ぶ"
      classNames={{ content: classes.sheet }}
    >
      {body}
    </Drawer>
  ) : (
    <Modal opened={opened} onClose={onClose} size="lg" title="OpenRouter のモデルを選ぶ" centered>
      {body}
    </Modal>
  );
}
