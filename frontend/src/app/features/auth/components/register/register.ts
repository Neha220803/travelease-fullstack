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

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.submitting.set(true);

    try {
      const form = event.target as HTMLFormElement;
      const data = new FormData(form);
      const name = String(data.get('name') ?? '').trim();
      const phone = String(data.get('phone') ?? '').trim();
      const email = String(data.get('email') ?? '').trim();
      const password = String(data.get('password') ?? '');
      const confirmPassword = String(data.get('confirmPassword') ?? '');
      const securityQuestion = String(data.get('securityQuestion') ?? '').trim();
      const securityAnswer = String(data.get('securityAnswer') ?? '').trim();

      if (password !== confirmPassword) {
        this.error.set('Passwords do not match.');
        return;
      }

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
