import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

@Component({
  selector: 'app-ticket-detail',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmTextareaImports, HlmLabelImports, PageHeader, StatusBadge],
  templateUrl: './ticket-detail.html',
})
export class TicketDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly detail = signal<SupportTicketDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly replyError = signal<string | null>(null);
  protected readonly replySubmitting = signal(false);

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

  protected onSubmitReply(event: Event, message: string, replyTextarea: HTMLTextAreaElement): void {
    event.preventDefault();
    const detail = this.detail();
    if (!detail || !message.trim()) {
      return;
    }
    this.replyError.set(null);
    this.replySubmitting.set(true);
    this.supportTicketService.addReply(detail.ticket.ticketId, message).subscribe({
      next: (reply) => {
        this.replySubmitting.set(false);
        this.detail.set({ ...detail, replies: [...detail.replies, reply] });
        replyTextarea.value = '';
      },
      error: () => {
        this.replySubmitting.set(false);
        this.replyError.set('Could not post the reply. Please try again.');
      },
    });
  }
}
