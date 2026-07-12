import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Register } from '@app/features/auth/components/register/register';

describe('Register', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Register);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    return { fixture, navigateSpy, http };
  }

  function fillForm(el: HTMLElement) {
    (el.querySelector('#name') as HTMLInputElement).value = 'Jane Doe';
    (el.querySelector('#phone') as HTMLInputElement).value = '9876543210';
    (el.querySelector('#email') as HTMLInputElement).value = 'jane@example.com';
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#securityQuestion') as HTMLSelectElement).value =
      'What was the name of your first pet?';
    (el.querySelector('#securityAnswer') as HTMLInputElement).value = 'Rex';
  }

  it('renders empty name, phone, email, password, confirmPassword and securityAnswer inputs plus a security question select', async () => {
    const { fixture } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs).toHaveLength(6);
    for (const input of inputs) {
      expect(input.value).toBe('');
    }
    expect(el.querySelector('select#securityQuestion')).not.toBeNull();
  });

  it('blocks submission and shows inline errors when required fields are invalid', async () => {
    const { fixture, navigateSpy } = await setup();
    const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    const errorTexts = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('p.text-destructive'),
    ).map((p) => p.textContent);
    expect(errorTexts.some((t) => t?.includes('10 digits'))).toBe(true);
    expect(errorTexts.some((t) => t?.includes('security question'))).toBe(true);
  });

  it('rejects a password without a special character', async () => {
    const { fixture, navigateSpy } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('submits and navigates to /login on success', async () => {
    const { fixture, navigateSpy, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = http.expectOne(`${API_BASE_URL}/api/auth/register`);
    expect(req.request.body.phone).toBe('9876543210');
    expect(req.request.body.securityQuestion).toBe('What was the name of your first pet?');
    req.flush({ success: true, data: { id: '1' }, message: 'ok', error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    http.verify();
  });

  it('points the footer link to /login', async () => {
    const { fixture } = await setup();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]');
    expect(link).not.toBeNull();
  });
});
