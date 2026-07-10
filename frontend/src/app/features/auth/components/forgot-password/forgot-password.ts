import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';

const SECURITY_QUESTION = 'What is the name of the hospital where you were born?';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly securityQuestion = SECURITY_QUESTION;
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<
    Partial<Record<'email' | 'securityAnswer' | 'newPassword' | 'confirmNewPassword', string>>
  >({});

  protected clearFieldError(
    field: 'email' | 'securityAnswer' | 'newPassword' | 'confirmNewPassword',
  ): void {
    const { [field]: _removed, ...rest } = this.fieldErrors();
    this.fieldErrors.set(rest);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim();
    const newPassword = String(data.get('newPassword') ?? '');
    const confirmNewPassword = String(data.get('confirmNewPassword') ?? '');

    const errors: Partial<
      Record<'email' | 'securityAnswer' | 'newPassword' | 'confirmNewPassword', string>
    > = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!securityAnswer) {
      errors.securityAnswer = 'Security answer is required.';
    }
    if (newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
      errors.newPassword = 'Password must be at least 8 characters and contain a letter and a digit.';
    }
    if (confirmNewPassword !== newPassword) {
      errors.confirmNewPassword = 'Passwords do not match.';
    }
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    this.submitting.set(true);
    try {
      await this.authService.resetPassword(email, securityAnswer, newPassword);
      this.toastService.showSuccess('Password reset successfully. Please sign in.');
      this.router.navigate(['/login']);
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to reset your password right now.')
          : 'Unable to reset your password right now.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
