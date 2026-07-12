import { Component, inject, OnInit, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { ToastService } from '@app/shared/ui/toast/toast.service';

const SECURITY_QUESTIONS = [
  'What is the name of the hospital where you were born?',
  'What is your birth hospital?',
  'What was the name of your first pet?',
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'What is your favorite book?',
];

type FormField = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'securityAnswer';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string;
}

@Component({
  selector: 'app-admin-users',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmInputImports,
    HlmAvatarImports,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './admin-users.html',
})
export class AdminUsers implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  public readonly rows = signal<AdminUserRow[]>([]);
  public readonly securityQuestions = SECURITY_QUESTIONS;

  readonly form = signal({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'TRAVELER',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: '',
  });

  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);
  readonly fieldErrors = signal<Partial<Record<FormField, string>>>({});

  ngOnInit(): void {
    void this.loadUsers();
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update(v => !v);
  }

  updateField(field: FormField | 'securityQuestion', value: string): void {
    this.form.set({ ...this.form(), [field]: value });
    if (field !== 'securityQuestion') {
      const { [field]: _removed, ...rest } = this.fieldErrors();
      this.fieldErrors.set(rest);
    }
  }

  updateRole(value: string): void {
    this.form.set({ ...this.form(), role: value });
  }

  async createUser(): Promise<void> {
    const errors = this.validateForm();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    this.submitting.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<unknown>>(`${API_BASE_URL}/api/admin/users`, {
          name: this.form().name.trim(),
          email: this.form().email.trim(),
          phone: this.form().phone.trim(),
          password: this.form().password,
          role: this.form().role,
          securityQuestion: this.form().securityQuestion,
          securityAnswer: this.form().securityAnswer.trim(),
        }),
      );

      this.toastService.showSuccess(response.message ?? 'User created successfully.');
      this.form.set({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'TRAVELER',
        securityQuestion: SECURITY_QUESTIONS[0],
        securityAnswer: '',
      });
      this.passwordVisible.set(false);
      this.confirmPasswordVisible.set(false);
      await this.loadUsers();
    } catch (error) {
      this.toastService.showError('Unable to create user right now.');
    } finally {
      this.submitting.set(false);
    }
  }

  private validateForm(): Partial<Record<FormField, string>> {
    const { name, email, phone, password, confirmPassword, securityAnswer } = this.form();
    const errors: Partial<Record<FormField, string>> = {};

    // Name: min 2 chars, letters and spaces only
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      errors.name = 'Name can only contain letters and spaces.';
    }

    // Email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    // Phone: exactly 10 digits
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errors.phone = 'Phone is required.';
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      errors.phone = 'Phone must be exactly 10 digits.';
    }

    // Password: 8+ chars, letter + digit
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password)) {
      errors.password = 'Password must contain at least one letter and one digit.';
    }

    // Confirm password
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm the password.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    // Security answer
    if (!securityAnswer.trim()) {
      errors.securityAnswer = 'Security answer is required.';
    }

    return errors;
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Array<{ id: string; name: string; email: string; role: string }>>>(`${API_BASE_URL}/api/admin/users`),
      );

      this.rows.set((response.data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
        status: 'Active',
        avatar: this.getInitials(user.name),
      })));
    } catch (error) {
      this.toastService.showError('Unable to load users right now.');
    } finally {
      this.loading.set(false);
    }
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
