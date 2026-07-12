import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';
import { SECURITY_QUESTIONS } from '@app/features/auth/security-questions';

type PartnerRegisterField =
  | 'name'
  | 'phone'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'role'
  | 'securityQuestion'
  | 'securityAnswer';

@Component({
  selector: 'app-partner-register',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './partner-register.html',
})
export class PartnerRegister {
  private readonly authService = inject(AuthService);

  protected readonly securityQuestions = SECURITY_QUESTIONS;
  protected readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<Partial<Record<PartnerRegisterField, string>>>({});

  protected clearFieldError(field: PartnerRegisterField): void {
    const { [field]: _removed, ...rest } = this.fieldErrors();
    this.fieldErrors.set(rest);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.success.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');
    const role = String(data.get('role') ?? '');
    const securityQuestion = String(data.get('securityQuestion') ?? '').trim();
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim();

    const errors: Partial<Record<PartnerRegisterField, string>> = {};
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
    if (!role) {
      errors.role = 'Please select a partner type.';
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
      await this.authService.registerPartner({
        name,
        email,
        phone,
        password,
        role,
        securityQuestion,
        securityAnswer,
      });
      this.success.set('Your application has been submitted and is awaiting admin approval.');
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to submit your application right now.')
          : 'Unable to submit your application right now.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
