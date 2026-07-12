import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { ToastService } from '@app/shared/ui/toast/toast.service';

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

interface AllPartnerDto {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
}

interface PartnerRow {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  rejectionReason: string | null;
  registered: string;
  icon: string;
}

export type ApprovalTab = 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-admin-approvals',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmBadgeImports, HlmInputImports, PageHeader, StatusBadge],
  templateUrl: './admin-approvals.html',
})
export class AdminApprovals implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  public readonly allPartners = signal<PartnerRow[]>([]);
  public readonly loading = signal(false);
  public readonly activeTab = signal<ApprovalTab>('pending');

  // Rejection dialog state
  public readonly rejectDialogOpen = signal(false);
  public readonly rejectTargetId = signal<string | null>(null);
  public readonly rejectReason = signal('');
  public readonly rejectReasonError = signal<string | null>(null);
  public readonly rejecting = signal(false);

  public readonly pending = computed(() => this.allPartners().filter(p => p.status === 'PENDING'));
  public readonly approved = computed(() => this.allPartners().filter(p => p.status === 'APPROVED'));
  public readonly rejected = computed(() => this.allPartners().filter(p => p.status === 'REJECTED'));

  public readonly pendingCount = computed(() => this.pending().length);
  public readonly approvedCount = computed(() => this.approved().length);
  public readonly rejectedCount = computed(() => this.rejected().length);

  public readonly activeList = computed(() => {
    switch (this.activeTab()) {
      case 'pending': return this.pending();
      case 'approved': return this.approved();
      case 'rejected': return this.rejected();
    }
  });

  ngOnInit(): void {
    void this.loadAll();
  }

  setTab(tab: ApprovalTab): void {
    this.activeTab.set(tab);
  }

  async approve(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put<ApiResponse<unknown>>(`${API_BASE_URL}/api/admin/partners/${id}/approve`, {}),
      );
      this.toastService.showSuccess('Partner approved successfully.');
      await this.loadAll();
    } catch {
      this.toastService.showError('Unable to approve this partner right now.');
    }
  }

  openRejectDialog(id: string): void {
    this.rejectTargetId.set(id);
    this.rejectReason.set('');
    this.rejectReasonError.set(null);
    this.rejectDialogOpen.set(true);
  }

  closeRejectDialog(): void {
    this.rejectDialogOpen.set(false);
    this.rejectTargetId.set(null);
    this.rejectReason.set('');
    this.rejectReasonError.set(null);
  }

  updateRejectReason(value: string): void {
    this.rejectReason.set(value);
    if (value.trim()) {
      this.rejectReasonError.set(null);
    }
  }

  async confirmReject(): Promise<void> {
    const reason = this.rejectReason().trim();
    if (!reason) {
      this.rejectReasonError.set('Please provide a reason for rejection.');
      return;
    }
    const id = this.rejectTargetId();
    if (!id) return;

    this.rejecting.set(true);
    try {
      await firstValueFrom(
        this.http.put<ApiResponse<unknown>>(`${API_BASE_URL}/api/admin/partners/${id}/reject`, { reason }),
      );
      this.toastService.showSuccess('Partner rejected.');
      this.closeRejectDialog();
      await this.loadAll();
    } catch {
      this.toastService.showError('Unable to reject this partner right now.');
    } finally {
      this.rejecting.set(false);
    }
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<AllPartnerDto[]>>(`${API_BASE_URL}/api/admin/partners/all`),
      );
      this.allPartners.set((response.data ?? []).map(p => {
        const type = ROLE_TYPE[p.role] ?? p.role;
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          type,
          status: p.status,
          rejectionReason: p.rejectionReason,
          registered: p.createdAt?.slice(0, 10) ?? '',
          icon: iconForApprovalType(type),
        };
      }));
    } catch {
      this.toastService.showError('Unable to load partners right now.');
    } finally {
      this.loading.set(false);
    }
  }
}
