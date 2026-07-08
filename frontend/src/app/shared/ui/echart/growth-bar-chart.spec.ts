import { buildGrowthBarOption } from '@app/shared/ui/echart/growth-bar-chart';

describe('buildGrowthBarOption', () => {
  const items = [
    { label: 'Paragliding', value: 12 },
    { label: 'Scuba Diving', value: 8 },
  ];

  it('uses an elastic settle-on-load animation', () => {
    const option = buildGrowthBarOption(items, 'oklch(0.5 0.1 200)');
    expect(option['animationEasing']).toBe('elasticOut');
    expect(typeof option['animationDelay']).toBe('function');
  });

  it('keeps category order (not reversed, unlike the ranking chart)', () => {
    const option = buildGrowthBarOption(items, 'oklch(0.5 0.1 200)');
    const xAxis = option['xAxis'] as { data: string[] };
    expect(xAxis.data).toEqual(['Paragliding', 'Scuba Diving']);
    const series = (option['series'] as any[])[0];
    expect(series.data).toEqual([12, 8]);
  });

  it('applies the given color to the bar itemStyle', () => {
    const option = buildGrowthBarOption(items, 'oklch(0.5 0.1 200)');
    const series = (option['series'] as any[])[0];
    expect(series.itemStyle.color).toBe('oklch(0.5 0.1 200)');
  });

  it('formats labels with the given unit suffix', () => {
    const option = buildGrowthBarOption(items, 'oklch(0.5 0.1 200)', '%');
    const series = (option['series'] as any[])[0];
    expect(series.label.formatter).toBe('{c}%');
  });

  it('rotates axis labels only once there are more than 5 bars', () => {
    const few = buildGrowthBarOption(items, 'oklch(0.5 0.1 200)');
    expect((few['xAxis'] as any).axisLabel.rotate).toBe(0);

    const many = buildGrowthBarOption(
      Array.from({ length: 6 }, (_, i) => ({ label: `A${i}`, value: i })),
      'oklch(0.5 0.1 200)',
    );
    expect((many['xAxis'] as any).axisLabel.rotate).toBe(20);
  });
});
