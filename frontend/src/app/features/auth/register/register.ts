import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { AuthService } from '@app/core/auth/auth.service';
import { ApiError } from '@app/core/api/api-response.model';

function passwordStrengthValidator(control: { value: string }) {
  const value = control.value;
  if (!value) return null;
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasLength = value.length >= 8;
  if (hasLength && hasLetter && hasDigit) return null;
  return { passwordStrength: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, NgIconComponent, HlmButtonImports, HlmInputImports],
  template: `
    <div>
      <h2 class="text-2xl font-bold text-foreground">Create account</h2>
      <p class="text-muted-foreground mt-1 mb-8">Join TravelEase and start planning</p>

      @if (errorMessage()) {
        <div class="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3 mb-4 flex items-center gap-2">
          <ng-icon name="lucideAlertCircle" size="14" />
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="reg-name">Full Name</label>
          <input hlmInput id="reg-name" type="text" formControlName="name"
                 placeholder="Arjun Sharma" class="w-full"
                 [class.border-destructive]="isInvalid('name')" />
          @if (isInvalid('name')) {
            <p class="text-xs text-destructive">Full name is required.</p>
          }
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="reg-email">Email</label>
          <input hlmInput id="reg-email" type="email" formControlName="email"
                 placeholder="you@example.com" class="w-full"
                 [class.border-destructive]="isInvalid('email')" />
          @if (isInvalid('email')) {
            <p class="text-xs text-destructive">Please enter a valid email address.</p>
          }
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="reg-phone">Phone</label>
          <input hlmInput id="reg-phone" type="tel" formControlName="phone"
                 placeholder="+91 98765 43210" class="w-full"
                 [class.border-destructive]="isInvalid('phone')" />
          @if (isInvalid('phone')) {
            <p class="text-xs text-destructive">Phone number is required.</p>
          }
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="reg-password">Password</label>
          <div class="relative">
            <input hlmInput id="reg-password" [type]="showPwd() ? 'text' : 'password'"
                   formControlName="password" placeholder="Min. 8 chars with letter + digit"
                   class="w-full pr-10" [class.border-destructive]="isInvalid('password')" />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    (click)="showPwd.set(!showPwd())">
              <ng-icon [name]="showPwd() ? 'lucideEyeOff' : 'lucideEye'" size="14" />
            </button>
          </div>
          @if (isInvalid('password')) {
            <p class="text-xs text-destructive">Password must be at least 8 characters with at least one letter and one digit.</p>
          }
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="reg-confirm">Confirm Password</label>
          <input hlmInput id="reg-confirm" type="password" formControlName="confirmPassword"
                 placeholder="••••••••" class="w-full"
                 [class.border-destructive]="isInvalid('confirmPassword') || passwordMismatch" />
          @if (passwordMismatch) {
            <p class="text-xs text-destructive">Passwords do not match.</p>
          }
        </div>

        <button hlmBtn type="submit" class="w-full mt-2" [disabled]="form.invalid || loading()">
          @if (loading()) {
            <ng-icon name="lucideRefreshCw" size="14" class="animate-spin mr-2" />
            Creating account...
          } @else {
            Create Account
          }
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?
        <a routerLink="/login" class="text-primary font-medium hover:underline ml-1">Sign in</a>
      </div>
    </div>
  `,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPwd = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, passwordStrengthValidator]],
    confirmPassword: ['', Validators.required],
  });

  isInvalid(field: string) {
    const c = this.form.get(field);
    return c?.invalid && c?.touched;
  }

  get passwordMismatch() {
    const f = this.form;
    return f.get('password')?.value !== f.get('confirmPassword')?.value && f.get('confirmPassword')?.touched;
  }

  submit(): void {
    if (this.form.invalid || this.passwordMismatch) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    const { name, email, phone, password } = this.form.value;
    this.auth.register({ name: name!, email: email!, phone: phone!, password: password! }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.errorMessage.set(err?.message ?? 'Registration failed. Please try again.');
      },
    });
  }
}
