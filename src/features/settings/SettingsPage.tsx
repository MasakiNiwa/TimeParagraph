import {
  Button,
  Group,
  NumberInput,
  Radio,
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
import { methodInfo, type EstimationMethod } from '@/features/estimation/useEstimator';
import { useSettingsStore } from './settingsStore';

function SpeedField({
  label,
  hint,
  unit,
  value,
  range,
  onChange,
}: {
  label: string;
  hint: string;
  unit: string;
  value: number;
  range: [number, number];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        {hint}
      </Text>
      <Group align="center" wrap="nowrap">
        <Slider
          flex={1}
          min={range[0]}
          max={range[1]}
          step={10}
          value={value}
          onChange={onChange}
          label={(v) => `${v} ${unit}`}
          aria-label={label}
        />
        <NumberInput
          w={120}
          min={50}
          max={1500}
          suffix={` ${unit}`}
          value={value}
          onChange={(v) => typeof v === 'number' && onChange(v)}
        />
      </Group>
    </div>
  );
}

function EstimationSettings() {
  const { settings, update } = useSettingsStore();
  const { method, charsPerMinute, morasPerMinute, paragraphPauseSec } = settings.estimation;
  return (
    <Stack gap="lg">
      <Radio.Group
        label="推定方式"
        value={method}
        onChange={(v) => update({ estimation: { method: v as EstimationMethod } })}
      >
        <Stack gap="sm" mt="xs">
          {(Object.keys(methodInfo) as EstimationMethod[]).map((m) => (
            <Radio
              key={m}
              value={m}
              label={methodInfo[m].label}
              description={methodInfo[m].description}
            />
          ))}
        </Stack>
      </Radio.Group>
      {method === 'chars' ? (
        <SpeedField
          label="話す速さ(1分あたりの文字数)"
          hint="目安:ゆっくり 250 / 標準 300 / 速め 350"
          unit="字/分"
          value={charsPerMinute}
          range={[150, 500]}
          onChange={(v) => update({ estimation: { charsPerMinute: v } })}
        />
      ) : (
        <SpeedField
          label="話す速さ(1分あたりの拍数)"
          hint="目安:ゆっくり 360 / 標準 420 / 速め 480(拍 = かな 1 文字分の長さ)"
          unit="拍/分"
          value={morasPerMinute}
          range={[250, 700]}
          onChange={(v) => update({ estimation: { morasPerMinute: v } })}
        />
      )}
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
