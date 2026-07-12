import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import {
  SupportTicket,
  SupportTicketDetail,
  TicketStatus,
  TicketCategory
} from '@app/features/support/services/support-ticket.models';

const STATUS_OPTIONS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

@Component({
  selector: 'app-provider-support-tickets',
  imports: [DatePipe, HlmButtonImports, HlmCardImports, HlmSelectImports, HlmTextareaImports, HlmLabelImports, HlmInputImports, PageHeader, StatusBadge],
  templateUrl: './provider-support-tickets.html',
})
export class ProviderSupportTickets {
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly tickets = signal<SupportTicket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly selectedDetail = signal<SupportTicketDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly replyError = signal<string | null>(null);
  protected readonly replySubmitting = signal(false);

  protected readonly showRaiseForm = signal(false);
  protected readonly raiseCategory = signal<TicketCategory | null>(null);
  protected readonly raiseSubject = signal('');
  protected readonly raiseDescription = signal('');
  protected readonly raiseSubmitting = signal(false);
  protected readonly raiseError = signal<string | null>(null);

  protected readonly viewMode = signal<'ASSIGNED' | 'RAISED'>('ASSIGNED');

  constructor() {
    this.loadTickets();
  }

  protected setViewMode(mode: 'ASSIGNED' | 'RAISED'): void {
    this.viewMode.set(mode);
    this.selectedDetail.set(null);
    this.loadTickets();
  }

  protected toggleRaiseForm(): void {
    this.showRaiseForm.update(v => !v);
    if (this.showRaiseForm()) {
      this.raiseCategory.set(null);
      this.raiseSubject.set('');
      this.raiseDescription.set('');
      this.raiseError.set(null);
    }
  }

  protected submitPlatformTicket(event: Event): void {
    event.preventDefault();
    const category = this.raiseCategory();
    const subject = this.raiseSubject().trim();
    const desc = this.raiseDescription().trim();
    
    if (!category || !subject || !desc) {
      this.raiseError.set('Category, subject, and description are required.');
      return;
    }
    
    this.raiseError.set(null);
    this.raiseSubmitting.set(true);
    
    this.supportTicketService.createTicket({
      category,
      subject,
      description: desc,
      assignedProviderId: null
    }).subscribe({
      next: () => {
        this.raiseSubmitting.set(false);
        this.showRaiseForm.set(false);
        if (this.viewMode() !== 'RAISED') {
          this.setViewMode('RAISED');
        } else {
          this.loadTickets();
        }
      },
      error: () => {
        this.raiseSubmitting.set(false);
        this.raiseError.set('Failed to submit ticket. Please try again.');
      }
    });
  }

  protected selectTicket(ticketId: string): void {
    this.detailLoading.set(true);
    this.replyError.set(null);
    
    const request$ = this.viewMode() === 'ASSIGNED' 
      ? this.supportTicketService.getAssignedTicket(ticketId)
      : this.supportTicketService.getMyTicket(ticketId);

    request$.subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
      },
    });
  }

  protected onStatusChange(value: string | null | undefined): void {
    const detail = this.selectedDetail();
    if (!value || !detail || this.viewMode() === 'RAISED') {
      return;
    }
    this.supportTicketService.updateStatusProvider(detail.ticket.ticketId, value as TicketStatus).subscribe((updated) => {
      this.selectedDetail.set({ ...detail, ticket: updated });
      this.loadTickets();
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

    const request$ = this.viewMode() === 'ASSIGNED'
      ? this.supportTicketService.addReplyProvider(detail.ticket.ticketId, message)
      : this.supportTicketService.addReply(detail.ticket.ticketId, message);

    request$.subscribe({
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

  private loadTickets(): void {
    this.loading.set(true);
    this.error.set(false);

    const request$ = this.viewMode() === 'ASSIGNED'
      ? this.supportTicketService.getAssignedTickets()
      : this.supportTicketService.getMyTickets();

    request$.subscribe({
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
