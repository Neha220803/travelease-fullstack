import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicket } from '@app/features/support/services/support-ticket.models';

@Component({
  selector: 'app-my-tickets',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, PageHeader, StatusBadge],
  templateUrl: './my-tickets.html',
})
export class MyTickets {
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly tickets = signal<SupportTicket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  constructor() {
    this.supportTicketService.getMyTickets().subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
