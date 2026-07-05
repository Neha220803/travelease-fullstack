import { Component, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant; css: string }> = {
  UPCOMING:    { label: 'Upcoming',    variant: 'default',     css: 'bg-sky-100 text-sky-800 border-sky-200' },
  ACTIVE:      { label: 'Active',      variant: 'default',     css: 'bg-green-100 text-green-800 border-green-200' },
  COMPLETED:   { label: 'Completed',   variant: 'secondary',   css: 'bg-slate-100 text-slate-700 border-slate-200' },
  CANCELLED:   { label: 'Cancelled',   variant: 'destructive', css: 'bg-red-100 text-red-700 border-red-200' },
  PENDING:     { label: 'Pending',     variant: 'outline',     css: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED:   { label: 'Confirmed',   variant: 'default',     css: 'bg-green-100 text-green-800 border-green-200' },
  PAID:        { label: 'Paid',        variant: 'default',     css: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED:    { label: 'Rejected',    variant: 'destructive', css: 'bg-red-100 text-red-700 border-red-200' },
  ACCEPTED:    { label: 'Accepted',    variant: 'default',     css: 'bg-green-100 text-green-800 border-green-200' },
  ACTIVE_PROVIDER: { label: 'Active',  variant: 'default',     css: 'bg-green-100 text-green-800 border-green-200' },
  SUSPENDED:   { label: 'Suspended',   variant: 'destructive', css: 'bg-red-100 text-red-700 border-red-200' },
  MAINTENANCE: { label: 'Maintenance', variant: 'outline',     css: 'bg-amber-50 text-amber-700 border-amber-200' },
  INACTIVE:    { label: 'Inactive',    variant: 'secondary',   css: 'bg-slate-100 text-slate-600 border-slate-200' },
};

@Component({
  selector: 'app-status-badge',
  imports: [HlmBadgeImports],
  template: `
    <span hlmBadge
          [variant]="statusInfo.variant"
          class="text-[11px] font-medium px-2 py-0.5 border {{ statusInfo.css }}">
      {{ statusInfo.label }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<string>();

  get statusInfo() {
    return STATUS_MAP[this.status()] ?? { label: this.status(), variant: 'outline' as StatusVariant, css: '' };
  }
}
