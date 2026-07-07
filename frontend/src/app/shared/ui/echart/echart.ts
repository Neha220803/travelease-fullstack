import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { dispose, init, use } from 'echarts/core';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { BarChart, FunnelChart, HeatmapChart } from 'echarts/charts';
import {
  CalendarComponent,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';

use([
  SVGRenderer,
  BarChart,
  FunnelChart,
  HeatmapChart,
  CalendarComponent,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
]);

@Component({
  selector: 'app-echart',
  templateUrl: './echart.html',
})
export class EChart {
  public readonly options = input.required<EChartsCoreOption>();
  public readonly height = input('256px');

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private chart: ECharts | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const el = this.container().nativeElement;
      this.chart = init(el, undefined, { renderer: 'svg' });

      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => this.chart?.resize());
        resizeObserver.observe(el);
        destroyRef.onDestroy(() => resizeObserver.disconnect());
      }

      destroyRef.onDestroy(() => {
        if (this.chart) {
          dispose(this.chart);
          this.chart = null;
        }
      });

      this.chart.setOption(this.options());
    });
  }
}
