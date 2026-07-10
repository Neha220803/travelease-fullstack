import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Profile } from '@app/features/profile/components/profile/profile';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Profile', () => {
  async function setup() {
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
        id: '1', name: 'Asha R', email: 'asha@example.com', phone: '+91 9999999999',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'What hospital were you born in?',
      },
      message: 'Current user retrieved', error: null,
    });
    await flushMicrotasks();
    fixture.detectChanges();

    return { fixture, http };
  }

  it('loads the current user from auth/me and renders the returned profile details', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';

    expect(text).toContain('Asha R');
    expect(text).toContain('asha@example.com');
    expect(text).toContain('Traveler');

    const inputValues = Array.from(el.querySelectorAll('input')).map(
      (i) => (i as HTMLInputElement).value,
    );
    expect(inputValues).toContain('Asha R');
    expect(inputValues).toContain('asha@example.com');
    expect(inputValues).toContain('+91 9999999999');

    http.verify();
  });

  it('saves profile changes via PUT /api/auth/me and shows a success toast', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const nameInput = el.querySelector('input[name="name"]') as HTMLInputElement;
    const phoneInput = el.querySelector('input[name="phone"]') as HTMLInputElement;
    nameInput.value = 'Asha Rao';
    phoneInput.value = '8888888888';

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const updateReq = http.expectOne(`${API_BASE_URL}/api/auth/me`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual({ name: 'Asha Rao', phone: '8888888888' });
    updateReq.flush({
      success: true,
      data: {
        id: '1', name: 'Asha Rao', email: 'asha@example.com', phone: '8888888888',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'What hospital were you born in?',
      },
      message: 'Profile updated successfully', error: null,
    });
    await flushMicrotasks();
    fixture.detectChanges();

    expect((el.textContent ?? '')).toContain('Asha Rao');
    http.verify();
  });

  it('blocks the save when the name is too short and makes no HTTP call', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const nameInput = el.querySelector('input[name="name"]') as HTMLInputElement;
    nameInput.value = 'A';

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect((el.textContent ?? '')).toContain('Name must be at least 2 characters');
    http.verify();
  });

  it('opens the password form and submits a password change', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const toggleBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Change password'),
    ) as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    const answerInput = el.querySelector('input[name="securityAnswer"]') as HTMLInputElement;
    const newPasswordInput = el.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmInput = el.querySelector('input[name="confirmNewPassword"]') as HTMLInputElement;
    answerInput.value = 'City General';
    newPasswordInput.value = 'NewPassw0rd1';
    confirmInput.value = 'NewPassw0rd1';

    const forms = el.querySelectorAll('form');
    const passwordForm = forms[1] as HTMLFormElement;
    passwordForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const req = http.expectOne(`${API_BASE_URL}/api/auth/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ securityAnswer: 'City General', newPassword: 'NewPassw0rd1' });
    req.flush({ success: true, data: null, message: 'Password changed successfully', error: null });
    await flushMicrotasks();
    fixture.detectChanges();

    expect(el.querySelectorAll('form')).toHaveLength(1);
    http.verify();
  });

  it('blocks the password change when confirmation does not match and makes no HTTP call', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const toggleBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Change password'),
    ) as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    const answerInput = el.querySelector('input[name="securityAnswer"]') as HTMLInputElement;
    const newPasswordInput = el.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmInput = el.querySelector('input[name="confirmNewPassword"]') as HTMLInputElement;
    answerInput.value = 'City General';
    newPasswordInput.value = 'NewPassw0rd1';
    confirmInput.value = 'DifferentPassw0rd1';

    const forms = el.querySelectorAll('form');
    const passwordForm = forms[1] as HTMLFormElement;
    passwordForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect((el.textContent ?? '')).toContain('Passwords do not match');
    http.verify();
  });
});
