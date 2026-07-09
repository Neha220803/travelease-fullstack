import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideBus, lucideCheck, lucideHotel, lucideX } from '@ng-icons/lucide';
import { API_BASE_URL } from '@app/core/api/api-config';
import { AdminApprovals, iconForApprovalType } from '@app/features/admin/components/admin-approvals/admin-approvals';

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
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminApprovals);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  const pendingResponse = {
    success: true,
    message: 'Pending partners retrieved',
    error: null,
    data: [
      { id: 'p1', name: 'Coral Reef Resort', email: 'coral@example.com', role: 'ROLE_HOTEL_PROVIDER', createdAt: '2026-06-08T09:00:00' },
      { id: 'p2', name: 'MountainLine Buses', email: 'mountainline@example.com', role: 'ROLE_PROVIDER', createdAt: '2026-06-10T09:00:00' },
    ],
  };

  it('loads pending partners and renders the stat counts and rows', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/api/admin/partners/pending`).flush(pendingResponse);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.pendingCount()).toBe(2);
    expect(c.hotelCount()).toBe(1);
    expect(c.transportCount()).toBe(1);
    expect(c.activityCount()).toBe(0);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Coral Reef Resort');
    expect(text).toContain('MountainLine Buses');

    http.verify();
  });

  it('approves a partner and removes it from the pending list', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/api/admin/partners/pending`).flush(pendingResponse);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const approveButtons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).filter((b) => b.textContent?.includes('Approve'));
    approveButtons[0].dispatchEvent(new Event('click'));

    const approveReq = http.expectOne(`${API_BASE_URL}/api/admin/partners/p1/approve`);
    expect(approveReq.request.method).toBe('PUT');
    approveReq.flush({ success: true, data: null, message: 'Partner approved', error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.approvals()).toHaveLength(1);
    expect(fixture.componentInstance.approvals()[0].id).toBe('p2');

    http.verify();
  });
});
