import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  useMantineColorScheme,
  type MantineColorScheme,
} from '@mantine/core';
import { IconClock, IconDatabase, IconPalette } from '@tabler/icons-react';
import { CollapsibleSections } from '@/components/CollapsibleSections';
import { PageContainer } from '@/components/PageContainer';
import { useSettingsStore } from './settingsStore';

function EstimationSettings() {
  const { settings, update } = useSettingsStore();
  const { charsPerMinute, paragraphPauseSec } = settings.estimation;
  return (
    <Stack gap="lg">
      <div>
        <Text size="sm" fw={500}>
          話す速さ(1分あたりの文字数)
        </Text>
        <Text size="xs" c="dimmed" mb="xs">
          目安:ゆっくり 250 / 標準 300 / 速め 350
        </Text>
        <Group align="center" wrap="nowrap">
          <Slider
            flex={1}
            min={150}
            max={500}
            step={10}
            value={charsPerMinute}
            onChange={(v) => update({ estimation: { charsPerMinute: v } })}
            label={(v) => `${v} 字/分`}
            aria-label="話す速さ"
          />
          <NumberInput
            w={110}
            min={50}
            max={1000}
            suffix=" 字/分"
            value={charsPerMinute}
            onChange={(v) => typeof v === 'number' && update({ estimation: { charsPerMinute: v } })}
          />
        </Group>
      </div>
      <NumberInput
        label="パラグラフ間の間(秒)"
        description="パラグラフの切り替わりごとに加算する時間"
        min={0}
        max={30}
        step={0.5}
        decimalScale={1}
        value={paragraphPauseSec}
        onChange={(v) => typeof v === 'number' && update({ estimation: { paragraphPauseSec: v } })}
        maw={240}
      />
    </Stack>
  );
}

function DisplaySettings() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { settings, update } = useSettingsStore();
  return (
    <Stack gap="lg">
      <div>
        <Text size="sm" fw={500} mb={4}>
          テーマ
        </Text>
        <SegmentedControl
          value={colorScheme}
          onChange={(v) => setColorScheme(v as MantineColorScheme)}
          data={[
            { value: 'auto', label: '端末に合わせる' },
            { value: 'light', label: 'ライト' },
            { value: 'dark', label: 'ダーク' },
          ]}
        />
      </div>
      <div>
        <Text size="sm" fw={500} mb={4}>
          エディタの文字サイズ
        </Text>
        <SegmentedControl
          value={settings.editor.fontSize}
          onChange={(v) => update({ editor: { fontSize: v as 'sm' | 'md' | 'lg' } })}
          data={[
            { value: 'sm', label: '小' },
            { value: 'md', label: '中' },
            { value: 'lg', label: '大' },
          ]}
        />
      </div>
    </Stack>
  );
}

function DataSettings() {
  const reset = useSettingsStore((s) => s.reset);
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        設定はこのブラウザ内にのみ保存されます。
      </Text>
      <Group>
        <Button
          variant="light"
          color="red"
          onClick={() => {
            if (window.confirm('設定を初期状態に戻しますか?')) reset();
          }}
        >
          設定を初期化
        </Button>
      </Group>
    </Stack>
  );
}

export function SettingsPage() {
  return (
    <PageContainer title="設定">
      <CollapsibleSections
        sections={[
          {
            id: 'estimation',
            title: '時間の推定',
            icon: IconClock,
            content: <EstimationSettings />,
          },
          { id: 'display', title: '表示', icon: IconPalette, content: <DisplaySettings /> },
          { id: 'data', title: 'データ', icon: IconDatabase, content: <DataSettings /> },
        ]}
      />
    </PageContainer>
  );
}
