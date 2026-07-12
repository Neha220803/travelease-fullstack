import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicket, SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

@Component({
  selector: 'app-my-tickets',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmTextareaImports, PageHeader, StatusBadge],
  templateUrl: './my-tickets.html',
})
export class MyTickets {
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly tickets = signal<SupportTicket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly selectedDetail = signal<SupportTicketDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly replyError = signal<string | null>(null);
  protected readonly replySubmitting = signal(false);

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

  protected selectTicket(ticketId: string): void {
    this.detailLoading.set(true);
    this.replyError.set(null);
    this.supportTicketService.getMyTicket(ticketId).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
      },
    });
  }

  protected onSubmitReply(event: Event, message: string, replyTextarea: HTMLTextAreaElement): void {
    event.preventDefault();
    const detail = this.selectedDetail();
    if (!detail || !message.trim()) {
      return;
    }
    this.replyError.set(null);
    this.replySubmitting.set(true);
    this.supportTicketService.addReply(detail.ticket.ticketId, message).subscribe({
      next: (reply) => {
        this.replySubmitting.set(false);
        this.selectedDetail.set({ ...detail, replies: [...detail.replies, reply] });
        replyTextarea.value = '';
      },
      error: () => {
        this.replySubmitting.set(false);
        this.replyError.set('Could not post the reply. Please try again.');
      },
    });
  }
}

