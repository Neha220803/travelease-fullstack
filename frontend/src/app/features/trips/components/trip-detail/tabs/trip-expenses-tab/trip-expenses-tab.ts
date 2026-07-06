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
  ExpenseParticipantShareRequest,
  ExpenseResponse,
  SettlementResponse,
  SettlementSummaryResponse,
} from '@app/features/trips/services/trip-expense.models';
import { TripsService } from '@app/features/trips/services/trips.service';
import { TripMember } from '@app/features/trips/services/trip.models';
import { AuthService } from '@app/core/auth/auth.service';

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

    this.expenseService.listTripExpenses(tripId).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loadingExpenses.set(false);
      },
      error: () => {
        this.error.set('Could not load expenses. Please try again.');
        this.loadingExpenses.set(false);
      },
    });

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
        this.pendingSettlements.set(
          summary.settlements.filter((s) => s.status === 'PENDING'),
        );
        this.loadingSettlements.set(false);
      },
      error: () => {
        this.loadingSettlements.set(false);
      },
    });
  }

  protected onMarkPaid(settlement: SettlementResponse): void {
    this.settlementService.markSettlementPaid(settlement.id).subscribe({
      next: (updated) => {
        this.pendingSettlements.update((list) =>
          list.filter((s) => s.id !== updated.id),
        );
      },
      error: () => {
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
        this.expenses.update(list => [...list, expense]);
        this.isSaving.set(false);
        this.resetForm();
        
        // Refresh settlements since new expense affects it
        this.refreshSettlements();
        
        ctx.close();
      },
      error: (err) => {
        console.error('Failed to save expense', err);
        this.isSaving.set(false);
      }
    });
  }

  private refreshSettlements(): void {
    this.settlementService.getSettlementSummary(this.tripId()).subscribe({
      next: (summary) => {
        this.settlementSummary.set(summary);
        this.pendingSettlements.set(
          summary.settlements.filter((s) => s.status === 'PENDING'),
        );
      }
    });
  }
}
