import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { MeResponse, ProfileService } from '@app/features/profile/services/profile.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { PageHeader } from '@app/shared/ui/page-header/page-header';

@Component({
  selector: 'app-profile',
  imports: [
    HlmCardImports,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmAvatarImports,
    PageHeader,
  ],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);

  protected readonly profile = signal<MeResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly savingProfile = signal(false);
  protected readonly profileError = signal<string | null>(null);

  protected readonly passwordFormOpen = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadProfile();
  }

  protected initials(name: string | null | undefined): string {
    const trimmed = name?.trim();
    if (!trimmed) {
      return 'U';
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'U';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected roleLabel(role: string | null | undefined): string {
    const roleMap: Record<string, string> = {
      ROLE_ADMIN: 'Admin',
      ROLE_TRAVELER: 'Traveler',
      ROLE_PROVIDER: 'Transport Partner',
      ROLE_HOTEL_PROVIDER: 'Hotel Partner',
      ROLE_ACTIVITY_PROVIDER: 'Activity Partner',
    };

    return roleMap[role ?? ''] ?? 'Traveler';
  }

  protected async onSaveProfile(event: Event): Promise<void> {
    event.preventDefault();
    this.profileError.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();

    if (name.length < 2) {
      this.profileError.set('Name must be at least 2 characters.');
      return;
    }
    if (!phone) {
      this.profileError.set('Phone is required.');
      return;
    }

    this.savingProfile.set(true);
    try {
      const updated = await this.profileService.updateProfile(name, phone);
      this.profile.set(updated);
      this.toastService.showSuccess('Profile updated successfully');
    } catch (err) {
      this.profileError.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to update your profile right now.')
          : 'Unable to update your profile right now.',
      );
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected togglePasswordForm(): void {
    this.passwordError.set(null);
    this.passwordFormOpen.update((open) => !open);
  }

  protected async onChangePassword(event: Event): Promise<void> {
    event.preventDefault();
    this.passwordError.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim();
    const newPassword = String(data.get('newPassword') ?? '');
    const confirmNewPassword = String(data.get('confirmNewPassword') ?? '');

    if (!securityAnswer) {
      this.passwordError.set('Please answer your security question.');
      return;
    }
    if (newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
      this.passwordError.set('New password must be at least 8 characters and contain a letter and a digit.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      this.passwordError.set('Passwords do not match.');
      return;
    }

    this.changingPassword.set(true);
    try {
      await this.profileService.changePassword(securityAnswer, newPassword);
      this.toastService.showSuccess('Password changed successfully');
      this.passwordFormOpen.set(false);
      form.reset();
    } catch (err) {
      this.passwordError.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to change your password right now.')
          : 'Unable to change your password right now.',
      );
    } finally {
      this.changingPassword.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const profile = await this.profileService.getMe();
      this.profile.set(profile);
    } catch {
      this.error.set('We could not load your profile. Please refresh and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
