import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { PartnerRegister } from '@app/features/auth/components/partner-register/partner-register';

describe('PartnerRegister', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [PartnerRegister],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(PartnerRegister);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  function fillForm(el: HTMLElement) {
    (el.querySelector('#name') as HTMLInputElement).value = 'Priya Partner';
    (el.querySelector('#phone') as HTMLInputElement).value = '9999999999';
    (el.querySelector('#email') as HTMLInputElement).value = 'priya@example.com';
    (el.querySelector('#role') as HTMLSelectElement).value = 'HOTEL_PROVIDER';
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#securityQuestion') as HTMLSelectElement).value =
      'What was the name of your first pet?';
    (el.querySelector('#securityAnswer') as HTMLInputElement).value = 'City General';
  }

  it('submits the application and shows a pending-approval message', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = http.expectOne(`${API_BASE_URL}/api/auth/register/partner`);
    expect(req.request.body.role).toBe('HOTEL_PROVIDER');
    expect(req.request.body.securityQuestion).toBe('What was the name of your first pet?');
    req.flush({ success: true, data: { id: '1' }, message: 'ok', error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.success()).toContain('awaiting admin approval');
    http.verify();
  });

  it('blocks submission when phone is not exactly 10 digits', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#phone') as HTMLInputElement).value = '12345';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    http.expectNone(`${API_BASE_URL}/api/auth/register/partner`);
    expect(el.textContent).toContain('exactly 10 digits');
  });

  it('blocks submission when password has no special character', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    http.expectNone(`${API_BASE_URL}/api/auth/register/partner`);
  });

  it('blocks submission when no security question is chosen', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#securityQuestion') as HTMLSelectElement).value = '';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    http.expectNone(`${API_BASE_URL}/api/auth/register/partner`);
  });
});
