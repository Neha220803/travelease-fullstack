import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastId = 0;
  public readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info', duration = 3000): void {
    const id = this.toastId++;
    const toast: Toast = { id, type, message, duration };
    
    this.toasts.update((current) => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  showSuccess(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration = 4000): void {
    this.show(message, 'error', duration);
  }

  remove(id: number): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
