import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { AuthService } from '@app/core/auth/auth.service';
import { ApiError } from '@app/core/api/api-response.model';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgIconComponent, HlmButtonImports, HlmInputImports],
  template: `
    <div>
      <h2 class="text-2xl font-bold text-foreground">Welcome back</h2>
      <p class="text-muted-foreground mt-1 mb-8">Sign in to your TravelEase account</p>

      @if (errorMessage()) {
        <div class="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3 mb-4 flex items-center gap-2">
          <ng-icon name="lucideAlertCircle" size="14" />
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground" for="login-email">Email</label>
          <input hlmInput id="login-email" type="email" formControlName="email"
                 placeholder="you@example.com" class="w-full"
                 [class.border-destructive]="emailInvalid" />
          @if (emailInvalid) {
            <p class="text-xs text-destructive">Please enter a valid email address.</p>
          }
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground" for="login-password">Password</label>
          <div class="relative">
            <input hlmInput id="login-password" [type]="showPassword() ? 'text' : 'password'"
                   formControlName="password" placeholder="••••••••" class="w-full pr-10"
                   [class.border-destructive]="passwordInvalid" />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    (click)="showPassword.set(!showPassword())">
              <ng-icon [name]="showPassword() ? 'lucideEyeOff' : 'lucideEye'" size="14" />
            </button>
          </div>
          @if (passwordInvalid) {
            <p class="text-xs text-destructive">Password is required.</p>
          }
        </div>

        <button hlmBtn type="submit" class="w-full" [disabled]="form.invalid || loading()">
          @if (loading()) {
            <ng-icon name="lucideRefreshCw" size="14" class="animate-spin mr-2" />
            Signing in...
          } @else {
            Sign In
          }
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?
        <a routerLink="/register" class="text-primary font-medium hover:underline ml-1">Create one</a>
      </div>

      <!-- Demo hint -->
      <div class="mt-6 p-3 bg-accent rounded-lg text-xs text-muted-foreground">
        <strong class="text-foreground">Demo tip:</strong> Use any email/password for the demo role switcher in the top bar after logging in. The backend must be running for real auth.
      </div>
    </div>
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  get emailInvalid() {
    const c = this.form.get('email');
    return c?.invalid && c?.touched;
  }

  get passwordInvalid() {
    const c = this.form.get('password');
    return c?.invalid && c?.touched;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.errorMessage.set(err?.message ?? 'Login failed. Please check your credentials.');
      },
    });
  }
}
