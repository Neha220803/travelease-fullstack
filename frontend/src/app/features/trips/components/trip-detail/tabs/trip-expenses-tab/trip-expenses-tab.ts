import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';

import { TripExpenseService } from '@app/features/trips/services/trip-expense.service';
import { TripSettlementService } from '@app/features/trips/services/trip-settlement.service';
import {
  CreateExpenseRequest,
  ExpenseParticipantResponse,
  ExpenseParticipantShareRequest,
  ExpenseResponse,
  SettlementResponse,
  SettlementSummaryResponse,
} from '@app/features/trips/services/trip-expense.models';
import { TripsService } from '@app/features/trips/services/trips.service';
import { TripMember } from '@app/features/trips/services/trip.models';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';

/** Max settlement rows visible before "View All" is shown */
const SETTLEMENT_DISPLAY_LIMIT = 5;
const EXPENSE_PAGE_SIZE = 10;

@Component({
  selector: 'app-trip-expenses-tab',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    HlmCheckboxImports,
  ],
  templateUrl: './trip-expenses-tab.html',
})
export class TripExpensesTab {
  private readonly route = inject(ActivatedRoute);
  private readonly expenseService = inject(TripExpenseService);
  private readonly settlementService = inject(TripSettlementService);
  private readonly tripsService = inject(TripsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private readonly tripId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('tripId') ?? '')),
    { initialValue: '' },
  );

  protected readonly expenses = signal<ExpenseResponse[]>([]);
  protected readonly members = signal<TripMember[]>([]);
  protected readonly settlementSummary = signal<SettlementSummaryResponse | null>(null);
  protected readonly pendingSettlements = signal<SettlementResponse[]>([]);

  protected readonly loadingExpenses = signal(true);
  protected readonly loadingSettlements = signal(true);
  protected readonly error = signal<string | null>(null);

  // --- Pagination ---
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly isLastPage = signal(true);
  protected readonly loadingMore = signal(false);

  // --- Current User ---
  protected readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? '');

  // A split needs someone else to split with - the backend rejects creation
  // outright on a trip with only the organizer and nobody else accepted yet.
  protected readonly canSplitExpense = computed(() => this.members().length > 1);
  protected readonly respondingExpenseId = signal<string | null>(null);

  // --- Expense Detail Popup ---
  protected readonly selectedExpense = signal<ExpenseResponse | null>(null);
  protected readonly showExpenseDetail = computed(() => this.selectedExpense() !== null);

  // --- Settlement View All ---
  protected readonly visibleSettlements = computed(() =>
    this.pendingSettlements().slice(0, SETTLEMENT_DISPLAY_LIMIT),
  );
  protected readonly hasMoreSettlements = computed(
    () => this.pendingSettlements().length > SETTLEMENT_DISPLAY_LIMIT,
  );
  protected readonly showAllSettlements = signal(false);

  // --- Form State ---
  protected readonly newExpenseName = signal('');
  protected readonly newExpenseAmount = signal<number | null>(null);
  protected readonly newExpensePayerId = signal('');
  protected readonly newExpenseParticipants = signal<Set<string>>(new Set());
  protected readonly newExpenseSplitMode = signal<'EQUAL' | 'CUSTOM'>('EQUAL');
  protected readonly newExpenseCustomShares = signal<Record<string, number>>({});
  protected readonly isSaving = signal(false);

  // Validation
  protected readonly payerName = computed(() => {
    const id = this.newExpensePayerId();
    return this.members().find((m) => m.userId === id)?.name || 'Select Payer';
  });

  protected readonly isFormValid = computed(() => {
    const name = this.newExpenseName().trim();
    const amount = this.newExpenseAmount() ?? 0;
    const payerId = this.newExpensePayerId();
    const participants = this.newExpenseParticipants();
    const splitMode = this.newExpenseSplitMode();
    const customShares = this.newExpenseCustomShares();

    if (!name || amount <= 0 || !payerId || participants.size === 0) return false;

    if (splitMode === 'CUSTOM') {
      let sum = 0;
      for (const p of participants) {
        const share = customShares[p] || 0;
        if (share < 0.01) return false; // Backend requires share > 0
        sum += share;
      }
      if (Math.abs(sum - amount) > 0.01) return false;
    }
    return true;
  });

  constructor() {
    const tripId = this.tripId();

    this.loadExpenses(tripId, 0);

    this.tripsService.getTripMembers(tripId).subscribe({
      next: (members) => {
        this.members.set(members);
        const currentUserId = this.authService.currentUser()?.id;
        
        if (members.length > 0) {
          const matchedMember = members.find(m => m.userId === currentUserId);
          const defaultPayerId = matchedMember ? matchedMember.userId : members[0].userId;
          this.newExpensePayerId.set(defaultPayerId);
          
          // Select all participants by default
          this.newExpenseParticipants.set(new Set(members.map(m => m.userId)));
        }
      },
      error: () => {
        // Non-critical
      },
    });

    this.settlementService.getSettlementSummary(tripId).subscribe({
      next: (summary) => {
        this.settlementSummary.set(summary);
        const currentId = this.currentUserId();
        this.pendingSettlements.set(
          summary.settlements
            .filter((s) => s.status === 'PENDING')
            .sort((a, b) => {
              const aIsReceiver = a.receiverId === currentId ? 1 : 0;
              const bIsReceiver = b.receiverId === currentId ? 1 : 0;
              return bIsReceiver - aIsReceiver;
            }),
        );
        this.loadingSettlements.set(false);
      },
      error: () => {
        this.loadingSettlements.set(false);
      },
    });
  }

  // --- Display Helpers ---

  protected displayPayerName(settlement: SettlementResponse): string {
    return settlement.payerId === this.currentUserId() ? 'You' : settlement.payerName;
  }

  protected displayReceiverName(settlement: SettlementResponse): string {
    return settlement.receiverId === this.currentUserId() ? 'You' : settlement.receiverName;
  }

  protected displayPaysVerb(settlement: SettlementResponse): string {
    return settlement.payerId === this.currentUserId() ? 'pay' : 'pays';
  }

  protected displayExpensePayer(expense: ExpenseResponse): string {
    return expense.payerId === this.currentUserId() ? 'You' : expense.payerName;
  }

  protected displayParticipantName(userId: string, name: string): string {
    return userId === this.currentUserId() ? 'You' : name;
  }

  protected myParticipation(expense: ExpenseResponse): ExpenseParticipantResponse | undefined {
    return expense.participants.find((p) => p.userId === this.currentUserId());
  }

  protected needsMyApproval(expense: ExpenseResponse): boolean {
    return expense.status === 'PENDING' && this.myParticipation(expense)?.status === 'PENDING';
  }

  protected approveExpense(expense: ExpenseResponse): void {
    this.respondingExpenseId.set(expense.id);
    this.expenseService.approveExpense(this.tripId(), expense.id).subscribe({
      next: (updated) => this.onExpenseResponded(updated),
      error: () => {
        this.toastService.showError('Could not approve this expense. Please try again.');
        this.respondingExpenseId.set(null);
      },
    });
  }

  protected rejectExpense(expense: ExpenseResponse): void {
    this.respondingExpenseId.set(expense.id);
    this.expenseService.rejectExpense(this.tripId(), expense.id).subscribe({
      next: (updated) => this.onExpenseResponded(updated),
      error: () => {
        this.toastService.showError('Could not reject this expense. Please try again.');
        this.respondingExpenseId.set(null);
      },
    });
  }

  private onExpenseResponded(updated: ExpenseResponse): void {
    this.expenses.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
    if (this.selectedExpense()?.id === updated.id) {
      this.selectedExpense.set(updated);
    }
    this.respondingExpenseId.set(null);
    if (updated.status === 'FINALIZED') {
      this.toastService.showSuccess('Expense split finalized');
      this.refreshSettlements();
    } else if (updated.status === 'REJECTED') {
      this.toastService.showSuccess('Expense split rejected');
    } else {
      this.toastService.showSuccess('Response recorded');
    }
  }

  // --- Expense Detail Popup ---

  protected openExpenseDetail(expense: ExpenseResponse): void {
    this.selectedExpense.set(expense);
  }

  protected closeExpenseDetail(): void {
    this.selectedExpense.set(null);
  }

  // --- Settlement View All ---

  protected openAllSettlements(): void {
    this.showAllSettlements.set(true);
  }

  protected closeAllSettlements(): void {
    this.showAllSettlements.set(false);
  }

  // --- Pagination ---

  private loadExpenses(tripId: string, page: number): void {
    this.expenseService.listTripExpenses(tripId, page, EXPENSE_PAGE_SIZE).subscribe({
      next: (pagedResult) => {
        if (page === 0) {
          this.expenses.set(pagedResult.content);
        } else {
          this.expenses.update((list) => [...list, ...pagedResult.content]);
        }
        this.currentPage.set(pagedResult.page);
        this.totalPages.set(pagedResult.totalPages);
        this.totalElements.set(pagedResult.totalElements);
        this.isLastPage.set(pagedResult.last);
        this.loadingExpenses.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.error.set('Could not load expenses. Please try again.');
        this.loadingExpenses.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  protected loadNextPage(): void {
    if (this.isLastPage() || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.loadExpenses(this.tripId(), this.currentPage() + 1);
  }

  protected onMarkPaid(settlement: SettlementResponse): void {
    this.settlementService.markSettlementPaid(settlement.id).subscribe({
      next: (updated) => {
        this.pendingSettlements.update((list) =>
          list.filter((s) => s.id !== updated.id),
        );
        this.toastService.showSuccess('Settlement marked as paid');
      },
      error: () => {
        this.toastService.showError('Could not mark settlement as paid. Please try again.');
        this.error.set('Could not mark settlement as paid. Please try again.');
      },
    });
  }

  // --- Form Actions ---

  protected toggleParticipant(userId: string): void {
    const set = new Set(this.newExpenseParticipants());
    if (set.has(userId)) {
      set.delete(userId);
      // Clear their custom share when unchecked
      this.newExpenseCustomShares.update((shares) => {
        const newShares = { ...shares };
        delete newShares[userId];
        return newShares;
      });
    } else {
      set.add(userId);
    }
    this.newExpenseParticipants.set(set);
  }

  protected updateCustomShare(userId: string, value: string): void {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      this.newExpenseCustomShares.update(shares => ({ ...shares, [userId]: num }));
    }
  }

  protected resetForm(): void {
    this.newExpenseName.set('');
    this.newExpenseAmount.set(null);
    this.newExpenseSplitMode.set('EQUAL');
    this.newExpenseCustomShares.set({});
    
    // Reset defaults
    const currentUserId = this.authService.currentUser()?.id;
    const membersList = this.members();
    if (membersList.length > 0) {
      const matchedMember = membersList.find(m => m.userId === currentUserId);
      this.newExpensePayerId.set(matchedMember ? matchedMember.userId : membersList[0].userId);
      this.newExpenseParticipants.set(new Set(membersList.map(m => m.userId)));
    }
  }

  protected onSaveExpense(ctx: any): void {
    if (!this.isFormValid() || this.isSaving()) return;

    this.isSaving.set(true);

    const splitMode = this.newExpenseSplitMode();
    const participants = Array.from(this.newExpenseParticipants());
    const customShares = this.newExpenseCustomShares();

    let shares: ExpenseParticipantShareRequest[] | null = null;
    
    if (splitMode === 'CUSTOM') {
      shares = participants.map(userId => ({
        userId,
        shareAmount: customShares[userId] || 0
      }));
    }

    const payload: CreateExpenseRequest = {
      amount: this.newExpenseAmount()!,
      category: 'General', // Defaulting category as it's not in the UI
      description: this.newExpenseName().trim(),
      expenseDate: new Date().toISOString().split('T')[0],
      payerId: this.newExpensePayerId(),
      participantIds: participants,
      participantShares: shares
    };

    this.expenseService.createExpense(this.tripId(), payload).subscribe({
      next: (expense) => {
        this.expenses.update(list => [expense, ...list]);
        this.totalElements.update(n => n + 1);
        this.isSaving.set(false);
        this.toastService.showSuccess('Expense added successfully');
        this.resetForm();
        
        // Refresh settlements since new expense affects it
        this.refreshSettlements();
        
        ctx.close();
      },
      error: (err) => {
        console.error('Failed to save expense', err);
        this.toastService.showError('Failed to save expense');
        this.isSaving.set(false);
      }
    });
  }

  private refreshSettlements(): void {
    this.settlementService.getSettlementSummary(this.tripId()).subscribe({
      next: (summary) => {
        this.settlementSummary.set(summary);
        const currentId = this.currentUserId();
        this.pendingSettlements.set(
          summary.settlements
            .filter((s) => s.status === 'PENDING')
            .sort((a, b) => {
              const aIsReceiver = a.receiverId === currentId ? 1 : 0;
              const bIsReceiver = b.receiverId === currentId ? 1 : 0;
              return bIsReceiver - aIsReceiver;
            }),
        );
      }
    });
  }
}
