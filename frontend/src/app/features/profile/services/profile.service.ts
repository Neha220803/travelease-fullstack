import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  providerId: number | null;
  securityQuestion: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  async getMe(): Promise<MeResponse> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<MeResponse>>(`${API_BASE_URL}/api/auth/me`),
    );
    return response.data;
  }

  async updateProfile(name: string, phone: string): Promise<MeResponse> {
    const response = await firstValueFrom(
      this.http.put<ApiResponse<MeResponse>>(`${API_BASE_URL}/api/auth/me`, { name, phone }),
    );
    return response.data;
  }

  async changePassword(securityAnswer: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiResponse<unknown>>(`${API_BASE_URL}/api/auth/change-password`, {
        securityAnswer,
        newPassword,
      }),
    );
  }
}
