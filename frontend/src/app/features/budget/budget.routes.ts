import { Routes } from '@angular/router';
import { BudgetSummary } from './components/budget-summary/budget-summary';
import { AddExpense } from './components/add-expense/add-expense';
import { ExpenseList } from './components/expense-list/expense-list';
import { Settlement } from './components/settlement/settlement';
import { SharedExpense } from './components/shared-expense/shared-expense';

export const BUDGET_ROUTES: Routes = [
  { path: '', component: BudgetSummary },
  { path: 'add-expense', component: AddExpense },
  { path: 'expenses', component: ExpenseList },
  { path: 'settlement', component: Settlement },
  { path: 'shared', component: SharedExpense }
];