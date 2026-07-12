import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import {
  SupportTicket,
  SupportTicketDetail,
  TicketCategory,
  TicketStatus,
} from '@app/features/support/services/support-ticket.models';

interface FilterOption<T> {
  value: T | 'ALL';
  label: string;
}

const CATEGORY_FILTERS: FilterOption<TicketCategory>[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'BUS', label: 'Bus' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_FILTERS: FilterOption<TicketStatus>[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_OPTIONS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

@Component({
  selector: 'app-admin-support-tickets',
  imports: [DatePipe, HlmButtonImports, HlmCardImports, HlmSelectImports, HlmTextareaImports, PageHeader, StatusBadge],
  templateUrl: './admin-support-tickets.html',
})
export class AdminSupportTickets {
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly categoryFilters = CATEGORY_FILTERS;
  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly categoryFilter = signal<TicketCategory | 'ALL'>('ALL');
  protected readonly statusFilter = signal<TicketStatus | 'ALL'>('ALL');
  protected readonly tickets = signal<SupportTicket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly selectedDetail = signal<SupportTicketDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly replyError = signal<string | null>(null);
  protected readonly replySubmitting = signal(false);

  constructor() {
    this.loadTickets();
  }

  protected onCategoryFilterChange(value: string | null | undefined): void {
    if (value) {
      this.categoryFilter.set(value as TicketCategory | 'ALL');
      this.loadTickets();
    }
  }

  protected onStatusFilterChange(value: string | null | undefined): void {
    if (value) {
      this.statusFilter.set(value as TicketStatus | 'ALL');
      this.loadTickets();
    }
  }

  protected selectTicket(ticketId: string): void {
    this.detailLoading.set(true);
    this.replyError.set(null);
    this.supportTicketService.getTicketForAdmin(ticketId).subscribe({
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
    if (!value || !detail) {
      return;
    }
    this.supportTicketService.updateStatusAdmin(detail.ticket.ticketId, value as TicketStatus).subscribe((updated) => {
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
    this.supportTicketService.addReplyAdmin(detail.ticket.ticketId, message).subscribe({
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
    const categoryValue = this.categoryFilter();
    const statusValue = this.statusFilter();
    const category = categoryValue === 'ALL' ? undefined : categoryValue;
    const status = statusValue === 'ALL' ? undefined : statusValue;
    this.supportTicketService.getAllTickets(category, status).subscribe({
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
