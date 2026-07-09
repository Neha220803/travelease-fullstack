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

  readonly form = signal({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'TRAVELER',
    securityQuestion: 'What is your birth hospital?',
    securityAnswer: '',
  });

  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly fieldErrors = signal<Partial<Record<'name' | 'email' | 'phone' | 'password' | 'securityAnswer', string>>>({});

  ngOnInit(): void {
    void this.loadUsers();
  }

  updateField(field: 'name' | 'email' | 'phone' | 'password' | 'securityQuestion' | 'securityAnswer', value: string): void {
    this.form.set({ ...this.form(), [field]: value });
    if (field === 'name' || field === 'email' || field === 'phone' || field === 'password' || field === 'securityAnswer') {
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
          name: this.form().name,
          email: this.form().email,
          phone: this.form().phone,
          password: this.form().password,
          role: this.form().role,
          securityQuestion: this.form().securityQuestion,
          securityAnswer: this.form().securityAnswer,
        }),
      );

      this.toastService.showSuccess(response.message ?? 'User created successfully.');
      this.form.set({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'TRAVELER',
        securityQuestion: 'What is your birth hospital?',
        securityAnswer: '',
      });
      await this.loadUsers();
    } catch (error) {
      this.toastService.showError('Unable to create user right now.');
    } finally {
      this.submitting.set(false);
    }
  }

  private validateForm(): Partial<Record<'name' | 'email' | 'phone' | 'password' | 'securityAnswer', string>> {
    const { name, email, phone, password, securityAnswer } = this.form();
    const errors: Partial<Record<'name' | 'email' | 'phone' | 'password' | 'securityAnswer', string>> = {};

    if (!name.trim()) {
      errors.name = 'Name is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!phone.trim()) {
      errors.phone = 'Phone is required.';
    }
    if (password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password)) {
      errors.password = 'Password must be at least 8 characters and contain a letter and a digit.';
    }
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
