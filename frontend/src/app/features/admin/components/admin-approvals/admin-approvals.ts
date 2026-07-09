import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';

export function iconForApprovalType(type: string): string {
  if (type === 'Hotel') return 'lucideHotel';
  if (type === 'Transport') return 'lucideBus';
  return 'lucideActivity';
}

const ROLE_TYPE: Record<string, string> = {
  ROLE_HOTEL_PROVIDER: 'Hotel',
  ROLE_PROVIDER: 'Transport',
  ROLE_ACTIVITY_PROVIDER: 'Activity',
};

interface PendingPartnerDto {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PendingPartnerRow {
  id: string;
  name: string;
  email: string;
  type: string;
  registered: string;
  icon: string;
}

@Component({
  selector: 'app-admin-approvals',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmBadgeImports, PageHeader],
  templateUrl: './admin-approvals.html',
})
export class AdminApprovals implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly approvals = signal<PendingPartnerRow[]>([]);
  public readonly loading = signal(false);
  public readonly message = signal<string | null>(null);

  public readonly pendingCount = computed(() => this.approvals().length);
  public readonly hotelCount = computed(() => this.approvals().filter((p) => p.type === 'Hotel').length);
  public readonly transportCount = computed(() => this.approvals().filter((p) => p.type === 'Transport').length);
  public readonly activityCount = computed(() => this.approvals().filter((p) => p.type === 'Activity').length);

  ngOnInit(): void {
    void this.loadPending();
  }

  async approve(id: string): Promise<void> {
    await this.act(id, 'approve');
  }

  async reject(id: string): Promise<void> {
    await this.act(id, 'reject');
  }

  private async act(id: string, action: 'approve' | 'reject'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put<ApiResponse<unknown>>(`${API_BASE_URL}/api/admin/partners/${id}/${action}`, {}),
      );
      this.approvals.set(this.approvals().filter((p) => p.id !== id));
    } catch {
      this.message.set(`Unable to ${action} this partner right now.`);
    }
  }

  private async loadPending(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PendingPartnerDto[]>>(`${API_BASE_URL}/api/admin/partners/pending`),
      );
      this.approvals.set((response.data ?? []).map((p) => {
        const type = ROLE_TYPE[p.role] ?? p.role;
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          type,
          registered: p.createdAt.slice(0, 10),
          icon: iconForApprovalType(type),
        };
      }));
    } catch {
      this.message.set('Unable to load pending partners right now.');
    } finally {
      this.loading.set(false);
    }
  }
}
