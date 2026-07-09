import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ProfileService } from '@app/features/profile/services/profile.service';

describe('ProfileService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(ProfileService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('getMe fetches the current user from /api/auth/me', async () => {
    const { service, httpMock } = await setup();

    const promise = service.getMe();
    const req = httpMock.expectOne(`${API_BASE_URL}/api/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      data: {
        id: '1', name: 'Asha R', email: 'asha@example.com', phone: '9999999999',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'Birth hospital?',
      },
      message: 'Current user retrieved', error: null,
    });

    const result = await promise;
    expect(result.name).toBe('Asha R');
    expect(result.securityQuestion).toBe('Birth hospital?');
    httpMock.verify();
  });

  it('updateProfile sends a PUT with name and phone and returns the updated user', async () => {
    const { service, httpMock } = await setup();

    const promise = service.updateProfile('Asha Rao', '8888888888');
    const req = httpMock.expectOne(`${API_BASE_URL}/api/auth/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Asha Rao', phone: '8888888888' });
    req.flush({
      success: true,
      data: {
        id: '1', name: 'Asha Rao', email: 'asha@example.com', phone: '8888888888',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'Birth hospital?',
      },
      message: 'Profile updated successfully', error: null,
    });

    const result = await promise;
    expect(result.name).toBe('Asha Rao');
    expect(result.phone).toBe('8888888888');
    httpMock.verify();
  });

  it('changePassword sends a POST with securityAnswer and newPassword', async () => {
    const { service, httpMock } = await setup();

    const promise = service.changePassword('City General', 'NewPassw0rd1');
    const req = httpMock.expectOne(`${API_BASE_URL}/api/auth/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ securityAnswer: 'City General', newPassword: 'NewPassw0rd1' });
    req.flush({ success: true, data: null, message: 'Password changed successfully', error: null });

    await promise;
    httpMock.verify();
  });
});
