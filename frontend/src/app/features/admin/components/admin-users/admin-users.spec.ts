import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { API_BASE_URL } from '@app/core/api/api-config';
import { AdminUsers } from '@app/features/admin/components/admin-users/admin-users';

describe('AdminUsers', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcons({ lucideSearch })],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminUsers);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  const usersResponse = {
    success: true,
    message: 'Users retrieved',
    error: null,
    data: [
      { id: 'u1', name: 'Asha Rao', email: 'asha@example.com', role: 'ROLE_TRAVELER' },
      { id: 'u2', name: 'Rahul Hotel Provider', email: 'hotel@example.com', role: 'ROLE_HOTEL_PROVIDER' },
    ],
  };

  it('loads users from the admin users endpoint and renders each row', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();

    const req = http.expectOne(`${API_BASE_URL}/api/admin/users`);
    expect(req.request.method).toBe('GET');
    req.flush(usersResponse);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const rows = fixture.componentInstance.rows();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'u1', name: 'Asha Rao', email: 'asha@example.com', role: 'Role Traveler' });
    expect(rows[1]).toMatchObject({ id: 'u2', name: 'Rahul Hotel Provider', email: 'hotel@example.com', role: 'Role Hotel Provider' });

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Asha Rao');
    expect(text).toContain('Rahul Hotel Provider');

    http.verify();
  });
});
