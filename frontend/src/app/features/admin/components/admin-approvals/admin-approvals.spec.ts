import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideBus, lucideCheck, lucideHotel, lucideX } from '@ng-icons/lucide';
import { API_BASE_URL } from '@app/core/api/api-config';
import { AdminApprovals, iconForApprovalType } from '@app/features/admin/components/admin-approvals/admin-approvals';
import { ToastService } from '@app/shared/ui/toast/toast.service';

describe('iconForApprovalType', () => {
  it('maps Hotel, Transport, and Activity to their icons', () => {
    expect(iconForApprovalType('Hotel')).toBe('lucideHotel');
    expect(iconForApprovalType('Transport')).toBe('lucideBus');
    expect(iconForApprovalType('Activity')).toBe('lucideActivity');
  });
});

describe('AdminApprovals', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [AdminApprovals],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcons({ lucideActivity, lucideBus, lucideCheck, lucideHotel, lucideX }),
        { provide: ToastService, useValue: { showSuccess: () => {}, showError: () => {} } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminApprovals);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  const allResponse = {
    success: true,
    message: 'All partners retrieved',
    error: null,
    data: [
      { id: 'p1', name: 'Coral Reef Resort', email: 'coral@example.com', role: 'ROLE_HOTEL_PROVIDER', status: 'PENDING', rejectionReason: null, createdAt: '2026-06-08T09:00:00' },
      { id: 'p2', name: 'MountainLine Buses', email: 'mountainline@example.com', role: 'ROLE_PROVIDER', status: 'PENDING', rejectionReason: null, createdAt: '2026-06-10T09:00:00' },
      { id: 'p3', name: 'Approved Hotel', email: 'approved@example.com', role: 'ROLE_HOTEL_PROVIDER', status: 'APPROVED', rejectionReason: null, createdAt: '2026-06-01T09:00:00' },
      { id: 'p4', name: 'Rejected Transport', email: 'rejected@example.com', role: 'ROLE_PROVIDER', status: 'REJECTED', rejectionReason: 'Incomplete docs', createdAt: '2026-05-20T09:00:00' },
    ],
  };

  it('loads all partners and computes tab counts', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/api/admin/partners/all`).flush(allResponse);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.pendingCount()).toBe(2);
    expect(c.approvedCount()).toBe(1);
    expect(c.rejectedCount()).toBe(1);

    http.verify();
  });

  it('defaults to the pending tab with pending partners visible', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/api/admin/partners/all`).flush(allResponse);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('pending');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Coral Reef Resort');
    expect(text).toContain('MountainLine Buses');

    http.verify();
  });

  it('opens rejection dialog and requires a reason', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/api/admin/partners/all`).flush(allResponse);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const c = fixture.componentInstance;
    c.openRejectDialog('p1');
    expect(c.rejectDialogOpen()).toBe(true);
    expect(c.rejectTargetId()).toBe('p1');

    // Try to confirm without a reason
    await c.confirmReject();
    expect(c.rejectReasonError()).toBe('Please provide a reason for rejection.');

    http.verify();
  });
});
