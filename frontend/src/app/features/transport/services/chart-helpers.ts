import type { EChartsCoreOption } from 'echarts/core';
import { CHART_COLORS } from '@app/shared/ui/echart/echart-theme';
import { ChartDataPoint } from '@app/features/transport/services/dashboard.models';

export function buildTrendLineOption(points: ChartDataPoint[]): EChartsCoreOption {
  return {
    grid: { left: 8, right: 8, top: 8, bottom: 24, containLabel: false },
    xAxis: { type: 'category', data: points.map((p) => p.label), axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', show: false },
    tooltip: { trigger: 'axis' },
    series: [{ type: 'line', data: points.map((p) => p.value), smooth: true, itemStyle: { color: CHART_COLORS.primary } }],
  };
}

export function buildStatusPieOption(points: ChartDataPoint[]): EChartsCoreOption {
  return {
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: ['45%', '70%'], data: points.map((p) => ({ name: p.label, value: p.value })) }],
  };
}
