import { Component, inject, signal, effect, OnDestroy, OnInit } from '@angular/core';
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
import { CreateTicketPayload, TicketCategory, Provider } from '@app/features/support/services/support-ticket.models';
import { Subject, takeUntil } from 'rxjs';

interface CategoryOption {
  value: TicketCategory;
  label: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'BUS', label: 'Bus' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'PLATFORM', label: 'Platform / App Issue' },
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
export class RaiseTicketForm implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly supportTicketService = inject(SupportTicketService);
  private destroy$ = new Subject<void>();

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly category = signal<TicketCategory | null>(null);
  protected readonly providers = signal<Provider[]>([]);
  protected readonly selectedProviderId = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly categoryLabel = (value: string): string =>
    this.categoryOptions.find((option) => option.value === value)?.label ?? value;

  protected readonly providerLabel = (value: string): string => {
    const p = this.providers().find((option) => option.id.toString() === value);
    return p ? p.businessName : value;
  };

  ngOnInit() {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onCategoryChange(value: string | null | undefined): void {
    if (value) {
      const cat = value as TicketCategory;
      this.category.set(cat);
      this.providers.set([]);
      this.selectedProviderId.set(null);

      let role = '';
      if (cat === 'HOTEL') role = 'ROLE_HOTEL_PROVIDER';
      else if (cat === 'BUS') role = 'ROLE_PROVIDER';
      else if (cat === 'ACTIVITY') role = 'ROLE_ACTIVITY_PROVIDER';

      if (role) {
        this.supportTicketService
          .getProviders(role)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (data) => {
              this.providers.set(data);
            }
          });
      }
    }
  }

  protected onProviderChange(value: string | null | undefined): void {
    if (value) {
      this.selectedProviderId.set(Number(value));
    }
  }

  protected onSubmit(event: Event, subject: string, description: string): void {
    event.preventDefault();
    this.error.set(null);

    const currentCat = this.category();

    if (!currentCat || !subject.trim() || !description.trim()) {
      this.error.set('Please select a category and fill in both the subject and description.');
      return;
    }

    if (['HOTEL', 'BUS', 'ACTIVITY'].includes(currentCat) && !this.selectedProviderId()) {
      this.error.set('Please select a provider.');
      return;
    }

    const payload: CreateTicketPayload = {
      category: currentCat,
      subject,
      description,
      assignedProviderId: this.selectedProviderId(),
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
