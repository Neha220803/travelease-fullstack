import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
  selector: 'app-partner-register',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './partner-register.html',
})
export class PartnerRegister {
  private readonly authService = inject(AuthService);

  protected readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.success.set(null);
    this.submitting.set(true);

    try {
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

      if (password !== confirmPassword) {
        this.error.set('Passwords do not match.');
        return;
      }

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
