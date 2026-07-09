import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, NgIcon],
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm min-w-[300px] animate-in slide-in-from-top-2 fade-in"
          [ngClass]="{
            'bg-success/10 text-success border border-success/20': toast.type === 'success',
            'bg-destructive/10 text-destructive border border-destructive/20': toast.type === 'error',
            'bg-primary/10 text-primary border border-primary/20': toast.type === 'info'
          }"
        >
          <ng-icon
            [name]="
              toast.type === 'success' ? 'lucideCheckCircle' :
              toast.type === 'error' ? 'lucideXCircle' : 'lucideInfo'
            "
            class="h-5 w-5"
          />
          <div class="flex-1 font-medium">{{ toast.message }}</div>
          <button
            (click)="toastService.remove(toast.id)"
            class="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
            [ngClass]="{
              'hover:bg-success/20': toast.type === 'success',
              'hover:bg-destructive/20': toast.type === 'error',
              'hover:bg-primary/20': toast.type === 'info'
            }"
          >
            <ng-icon name="lucideX" class="h-4 w-4" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  public toastService = inject(ToastService);
}
