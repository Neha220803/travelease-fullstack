import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Profile } from '@app/features/profile/components/profile/profile';

describe('Profile', () => {
  it('loads the current user from auth/me and renders the returned profile details', async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Profile);
    const http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const req = http.expectOne(`${API_BASE_URL}/api/auth/me`);
    req.flush({
      success: true,
      data: {
        id: '1',
        name: 'Asha R',
        email: 'asha@example.com',
        phone: '+91 9999999999',
        role: 'ROLE_TRAVELER',
        providerId: null,
      },
      message: 'Current user retrieved',
      error: null,
    });

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';

    expect(text).toContain('Asha R');
    expect(text).toContain('asha@example.com');
    expect(text).toContain('+91 9999999999');
    expect(text).toContain('Traveler');

    const inputValues = Array.from(el.querySelectorAll('input')).map(
      (i) => (i as HTMLInputElement).value,
    );
    expect(inputValues).toContain('Asha R');
    expect(inputValues).toContain('asha@example.com');
    expect(inputValues).toContain('+91 9999999999');

    http.verify();
  });
});
