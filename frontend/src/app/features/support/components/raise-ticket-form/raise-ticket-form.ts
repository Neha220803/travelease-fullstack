import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { CreateTicketPayload, TicketCategory } from '@app/features/support/services/support-ticket.models';

interface CategoryOption {
  value: TicketCategory;
  label: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'BUS', label: 'Bus' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'TRIP', label: 'Trip / General' },
  { value: 'OTHER', label: 'Other' },
];

@Component({
  selector: 'app-raise-ticket-form',
  imports: [
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    HlmTextareaImports,
    PageHeader,
  ],
  templateUrl: './raise-ticket-form.html',
})
export class RaiseTicketForm {
  private readonly router = inject(Router);
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly category = signal<TicketCategory>('OTHER');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly categoryLabel = (value: string): string =>
    this.categoryOptions.find((option) => option.value === value)?.label ?? value;

  protected onCategoryChange(value: string | null | undefined): void {
    if (value) {
      this.category.set(value as TicketCategory);
    }
  }

  protected onSubmit(event: Event, subject: string, description: string): void {
    event.preventDefault();
    this.error.set(null);

    if (!subject.trim() || !description.trim()) {
      this.error.set('Please fill in both the subject and description.');
      return;
    }

    const payload: CreateTicketPayload = {
      category: this.category(),
      subject,
      description,
    };

    this.submitting.set(true);
    this.supportTicketService.createTicket(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/support/tickets']);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.extractErrorMessage(err));
      },
    });
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.error?.error) {
      return err.error.error.message;
    }
    return 'Something went wrong submitting your ticket. Please try again.';
  }
}
