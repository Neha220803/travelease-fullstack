import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';
import { ROLE_HOME } from '@app/core/auth/auth.models';

import { ToastService } from '@app/shared/ui/toast/toast.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './login.html',
})
export class Login {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly fieldErrors = signal<Partial<Record<'email' | 'password', string>>>({});

  constructor() {
    const role = this.authService.isAuthenticated() ? this.authService.role() : null;
    if (role) {
      this.router.navigate([ROLE_HOME[role]]);
    }
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected clearFieldError(field: 'email' | 'password'): void {
    const { [field]: _removed, ...rest } = this.fieldErrors();
    this.fieldErrors.set(rest);
  }

  protected async onSubmit(event: Event, email: string, password: string): Promise<void> {
    event.preventDefault();
    this.error.set(null);

    const errors: Partial<Record<'email' | 'password', string>> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    this.submitting.set(true);
    try {
      const user = await this.authService.login(email, password);
      this.toastService.showSuccess('Login successful');
      this.router.navigate([ROLE_HOME[user.role]]);
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Invalid email or password')
          : 'Something went wrong. Please try again.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
