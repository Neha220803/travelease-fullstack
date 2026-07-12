import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '@app/core/auth/auth.service';
import { SECURITY_QUESTIONS } from '@app/features/auth/security-questions';

type RegisterField =
  | 'name'
  | 'phone'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'securityQuestion'
  | 'securityAnswer';

@Component({
  selector: 'app-register',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports, NgIcon],
  templateUrl: './register.html',
})
export class Register {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly securityQuestions = SECURITY_QUESTIONS;
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<Partial<Record<RegisterField, string>>>({});
  
  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  protected clearFieldError(field: RegisterField): void {
    const { [field]: _removed, ...rest } = this.fieldErrors();
    this.fieldErrors.set(rest);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');
    const securityQuestion = String(data.get('securityQuestion') ?? '').trim();
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim();

    const errors: Partial<Record<RegisterField, string>> = {};
    if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    }
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address (max 100 characters).';
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      errors.password =
        'Password must be 8+ characters with uppercase, lowercase, a digit, and a special character.';
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    if (!securityQuestion) {
      errors.securityQuestion = 'Please choose a security question.';
    }
    if (!securityAnswer) {
      errors.securityAnswer = 'Security answer is required.';
    }
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    this.submitting.set(true);
    try {
      await this.authService.register({
        name,
        email,
        phone,
        password,
        securityQuestion,
        securityAnswer,
      });
      this.router.navigate(['/login']);
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to create your account right now.')
          : 'Unable to create your account right now.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
