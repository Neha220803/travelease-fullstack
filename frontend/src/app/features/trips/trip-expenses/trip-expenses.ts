import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { ExpenseService } from '@app/core/services/expense.service';
import { Expense, CreateExpenseRequest } from '@app/core/models/expense.model';
import { MOCK_USERS } from '@app/core/data/mock-data';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';
import { EmptyState } from '@app/shared/components/empty-state/empty-state';

const CATEGORIES = ['TRANSPORT', 'ACCOMMODATION', 'FOOD', 'ACTIVITIES', 'SHOPPING', 'MEDICAL', 'VISA', 'INSURANCE', 'OTHER'];

@Component({
  selector: 'app-trip-expenses',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, NgIconComponent, HlmButtonImports, HlmInputImports, HlmSkeletonImports, StatusBadge, EmptyState],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Expenses</h1>
          <p class="text-muted-foreground text-sm mt-0.5">Total: ₹{{ totalAmount() | number }}</p>
        </div>
        <button hlmBtn (click)="showForm.set(!showForm())">
          <ng-icon [name]="showForm() ? 'lucideX' : 'lucidePlus'" size="14" class="mr-1.5" />
          {{ showForm() ? 'Cancel' : 'Add Expense' }}
        </button>
      </div>

      <!-- Add Expense form -->
      @if (showForm()) {
        <div class="bg-card border border-border rounded-xl p-5">
          <h2 class="text-base font-semibold mb-4">Add New Expense</h2>

          @if (formError()) {
            <div class="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3 mb-4">
              {{ formError() }}
            </div>
          }

          <form [formGroup]="expenseForm" (ngSubmit)="submitExpense()" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Amount (₹)</label>
                <input hlmInput type="number" formControlName="amount" placeholder="3200" class="w-full" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Category</label>
                <select formControlName="category"
                        class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium">Description</label>
              <input hlmInput type="text" formControlName="description"
                     placeholder="Dinner at Fisherman's Wharf" class="w-full" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Date</label>
                <input hlmInput type="date" formControlName="expenseDate" class="w-full" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Paid By</label>
                <select formControlName="payerId"
                        class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  @for (user of mockUsers; track user.id) {
                    <option [value]="user.id">{{ user.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button hlmBtn type="submit" [disabled]="expenseForm.invalid || submitting()">
                @if (submitting()) {
                  <ng-icon name="lucideRefreshCw" size="12" class="animate-spin mr-1.5" />
                }
                Add Expense
              </button>
              <button hlmBtn type="button" variant="outline" (click)="showForm.set(false)">Cancel</button>
            </div>
          </form>
        </div>
      }

      <!-- Expenses list -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4 flex justify-between">
              <div class="space-y-2 flex-1">
                <hlm-skeleton class="h-4 w-2/3 rounded" />
                <hlm-skeleton class="h-3 w-1/2 rounded" />
              </div>
              <hlm-skeleton class="h-6 w-20 rounded" />
            </div>
          }
        </div>
      } @else if (expenses().length === 0) {
        <app-empty-state icon="lucideReceipt" title="No expenses yet"
                         description="Add the first expense to start tracking your trip spending."
                         actionLabel="Add Expense" actionIcon="lucidePlus"
                         (action)="showForm.set(true)" />
      } @else {
        <div class="space-y-3">
          @for (expense of expenses(); track expense.id) {
            <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style="background: oklch(0.93 0.05 185)">
                <ng-icon name="lucideReceipt" size="16" class="text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ expense.description }}</div>
                <div class="text-xs text-muted-foreground mt-0.5">
                  {{ expense.category }} · {{ expense.expenseDate | date:'MMM d, yyyy' }} · Paid by {{ expense.payerName }}
                </div>
                <div class="text-xs text-muted-foreground">{{ expense.participantIds.length }} participants · Equal split</div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="font-bold">₹{{ expense.amount | number }}</div>
                <div class="text-xs text-muted-foreground">₹{{ (expense.amount / expense.participantIds.length) | number }} each</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TripExpenses implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly expenseService = inject(ExpenseService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly expenses = signal<Expense[]>([]);
  readonly showForm = signal(false);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly categories = CATEGORIES;
  readonly mockUsers = MOCK_USERS.filter(u => u.role === 'TRAVELER').slice(0, 3);
  readonly totalAmount = () => this.expenses().reduce((sum, e) => sum + e.amount, 0);

  private tripId = '';

  readonly expenseForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    category: ['FOOD', Validators.required],
    description: ['', Validators.required],
    expenseDate: [''],
    payerId: ['u1', Validators.required],
  });

  ngOnInit(): void {
    this.tripId = this.route.snapshot.paramMap.get('tripId') ?? 'trip1';
    this.expenseService.getExpenses(this.tripId).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loading.set(false);
      },
      error: () => {
        // Fall back to mock data when backend is unavailable
        const { MOCK_EXPENSES } = require('@app/core/data/mock-data');
        this.expenses.set(MOCK_EXPENSES.filter((e: Expense) => e.tripId === this.tripId));
        this.loading.set(false);
      },
    });
  }

  submitExpense(): void {
    if (this.expenseForm.invalid) return;
    this.submitting.set(true);
    this.formError.set(null);

    const value = this.expenseForm.value;
    const request: CreateExpenseRequest = {
      amount: value.amount!,
      category: value.category!,
      description: value.description!,
      expenseDate: value.expenseDate || undefined,
      payerId: value.payerId!,
      participantIds: ['u1', 'u2', 'u3'],
    };

    this.expenseService.createExpense(this.tripId, request).subscribe({
      next: (expense) => {
        this.expenses.update(es => [expense, ...es]);
        this.showForm.set(false);
        this.submitting.set(false);
        this.expenseForm.reset({ category: 'FOOD', payerId: 'u1' });
      },
      error: (err) => {
        // Fall back to mock insertion when backend is unavailable or trip doesn't exist
        const mockExpense = {
          id: 'exp_' + Date.now(),
          tripId: this.tripId,
          amount: request.amount,
          category: request.category,
          description: request.description,
          expenseDate: request.expenseDate || new Date().toISOString(),
          payerId: request.payerId,
          payerName: this.mockUsers.find(u => u.id === request.payerId)?.name || 'Unknown',
          participantIds: request.participantIds,
          splitType: 'EQUAL',
          createdAt: new Date().toISOString(),
        };
        
        this.expenses.update(es => [mockExpense as any, ...es]);
        this.showForm.set(false);
        this.submitting.set(false);
        this.expenseForm.reset({ category: 'FOOD', payerId: 'u1' });
      },
    });
  }
}
