import { useComputedColorScheme } from '@mantine/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';

// 使うグラフだけを登録してバンドルを小さくする。種類を増やすときはここに追加する
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export type EChartsOption = echarts.EChartsCoreOption;

/** 落ち着いた配色(ライト/ダーク) */
export const chartPalette = {
  light: ['#567a97', '#4f8f86', '#8a6fa6', '#b8953a', '#4a95a6', '#b06a84', '#7a8f4a'],
  dark: ['#7e9bb3', '#6fa39b', '#a08cb8', '#c4aa66', '#73adbb', '#bf8aa0', '#98a873'],
};

export function useChartColors() {
  const scheme = useComputedColorScheme('light');
  return {
    scheme,
    palette: chartPalette[scheme],
    text: scheme === 'dark' ? '#a7acb4' : '#495057',
    axis: scheme === 'dark' ? '#3a3f48' : '#dee2e6',
    accent: scheme === 'dark' ? '#d9a066' : '#d9480f',
  };
}

export interface ChartClick {
  dataIndex: number;
  seriesIndex: number;
  name: string;
}

/** ECharts の薄いラッパー。テーマ切り替えとリサイズに追従する */
export function EChart({
  option,
  height = 300,
  onClick,
}: {
  option: EChartsOption;
  height?: number;
  onClick?: (e: ChartClick) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const { scheme, palette, text } = useChartColors();

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, scheme === 'dark' ? 'dark' : undefined, {
      renderer: 'canvas',
    });
    chart.current = c;
    c.on('click', (e) =>
      clickRef.current?.({
        dataIndex: e.dataIndex,
        seriesIndex: e.seriesIndex ?? 0,
        name: e.name,
      }),
    );
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [scheme]);

  useEffect(() => {
    chart.current?.setOption(
      {
        backgroundColor: 'transparent',
        color: palette,
        textStyle: { color: text, fontFamily: 'inherit' },
        ...option,
      },
      true,
    );
  }, [option, palette, text, scheme]);

  useEffect(() => {
    chart.current?.resize();
  }, [height]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
