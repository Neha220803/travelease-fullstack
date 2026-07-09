import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

@Component({
  selector: 'app-ticket-detail',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, PageHeader, StatusBadge],
  templateUrl: './ticket-detail.html',
})
export class TicketDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly detail = signal<SupportTicketDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  constructor() {
    const ticketId = this.route.snapshot.paramMap.get('id');
    if (!ticketId) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.supportTicketService.getMyTicket(ticketId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
