import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './register.html',
})
export class Register {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<
    Partial<Record<'name' | 'phone' | 'email' | 'password' | 'confirmPassword' | 'securityAnswer', string>>
  >({});

  protected clearFieldError(
    field: 'name' | 'phone' | 'email' | 'password' | 'confirmPassword' | 'securityAnswer',
  ): void {
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

    const errors: Partial<
      Record<'name' | 'phone' | 'email' | 'password' | 'confirmPassword' | 'securityAnswer', string>
    > = {};
    if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (!phone) {
      errors.phone = 'Phone is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password)) {
      errors.password = 'Password must be at least 8 characters and contain a letter and a digit.';
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
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
