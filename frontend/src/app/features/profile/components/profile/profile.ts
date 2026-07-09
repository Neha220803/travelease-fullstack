import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { PageHeader } from '@app/shared/ui/page-header/page-header';

interface AuthMeResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  providerId: number | null;
}

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
  private readonly http = inject(HttpClient);

  protected readonly profile = signal<AuthMeResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<AuthMeResponse>>(`${API_BASE_URL}/api/auth/me`),
      );
      this.profile.set(response.data);
    } catch {
      this.error.set('We could not load your profile. Please refresh and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
