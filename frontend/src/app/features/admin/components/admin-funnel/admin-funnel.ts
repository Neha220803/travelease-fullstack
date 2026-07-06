import { Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { dropReasons, funnelStages } from '@app/core/mock-data';

interface FunnelStageRow {
  stage: string;
  users: number;
  dropReason: string;
  widthPct: number;
  pctOfTotal: string;
  dropPct: string | null;
}

function buildStages(total: number): FunnelStageRow[] {
  return funnelStages.map((s, i) => {
    const prev = i > 0 ? funnelStages[i - 1].users : s.users;
    const dropPct = i > 0 ? (((prev - s.users) / prev) * 100).toFixed(1) : null;
    return {
      stage: s.stage,
      users: s.users,
      dropReason: s.dropReason,
      widthPct: (s.users / total) * 100,
      pctOfTotal: ((s.users / total) * 100).toFixed(0),
      dropPct,
    };
  });
}

@Component({
  selector: 'app-admin-funnel',
  imports: [NgIcon, HlmCardImports, PageHeader],
  templateUrl: './admin-funnel.html',
})
export class AdminFunnel {
  public readonly total = funnelStages[0].users;
  public readonly completed = funnelStages[funnelStages.length - 1].users;
  public readonly conversion = ((this.completed / this.total) * 100).toFixed(1);
  public readonly totalDropOff = (100 - parseFloat(this.conversion)).toFixed(1);
  public readonly stages: FunnelStageRow[] = buildStages(this.total);
  public readonly dropReasons = dropReasons;
}
