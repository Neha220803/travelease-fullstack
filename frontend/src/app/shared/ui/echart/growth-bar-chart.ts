import type { EChartsCoreOption } from 'echarts/core';
import { CHART_COLORS } from '@app/shared/ui/echart/echart-theme';

export interface GrowthBarItem {
  label: string;
  value: number;
}

/**
 * Vertical bars that grow up from zero and settle with a slight overshoot
 * (elasticOut easing, staggered per-bar delay) rather than a flat linear rise.
 */
export function buildGrowthBarOption(
  items: GrowthBarItem[],
  color: string,
  unit: '' | '%' = '',
): EChartsCoreOption {
  return {
    animationDuration: 1400,
    animationEasing: 'elasticOut',
    animationDelay: (idx: number) => idx * 90,
    grid: { left: 8, right: 8, top: 24, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: items.map((i) => i.label),
      axisLabel: {
        color: CHART_COLORS.mutedForeground,
        fontSize: 11,
        interval: 0,
        rotate: items.length > 5 ? 20 : 0,
      },
      axisLine: { lineStyle: { color: CHART_COLORS.muted } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value', show: false },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}${unit}` },
    series: [
      {
        type: 'bar',
        data: items.map((i) => i.value),
        barMaxWidth: 42,
        itemStyle: { color, borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: CHART_COLORS.mutedForeground, fontSize: 11, formatter: `{c}${unit}` },
      },
    ],
  };
}
