import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ForgotPassword } from '@app/features/auth/components/forgot-password/forgot-password';
import { AuthService } from '@app/core/auth/auth.service';

describe('ForgotPassword', () => {
  async function setup(overrides: Partial<AuthService> = {}) {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { ...overrides } },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    return { fixture, navigateSpy };
  }

  function submitWith(
    el: HTMLElement,
    values: { email: string; securityAnswer: string; newPassword: string; confirmNewPassword: string },
  ) {
    (el.querySelector('input[name="email"]') as HTMLInputElement).value = values.email;
    (el.querySelector('input[name="securityAnswer"]') as HTMLInputElement).value = values.securityAnswer;
    (el.querySelector('input[name="newPassword"]') as HTMLInputElement).value = values.newPassword;
    (el.querySelector('input[name="confirmNewPassword"]') as HTMLInputElement).value =
      values.confirmNewPassword;
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }

  it('renders the fixed security question as a read-only input value', async () => {
    const { fixture } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    const securityQuestionInput = el.querySelector('#securityQuestion') as HTMLInputElement;
    expect(securityQuestionInput.value).toBe('What is the name of the hospital where you were born?');
    expect(securityQuestionInput.readOnly).toBe(true);
  });

  it('resets the password and navigates to /login on success', async () => {
    const resetPassword = vi.fn().mockResolvedValue(undefined);
    const { fixture, navigateSpy } = await setup({ resetPassword });
    const el = fixture.nativeElement as HTMLElement;

    submitWith(el, {
      email: 'asha@example.com',
      securityAnswer: 'City General',
      newPassword: 'NewPassw0rd1',
      confirmNewPassword: 'NewPassw0rd1',
    });
    await fixture.whenStable();

    expect(resetPassword).toHaveBeenCalledWith('asha@example.com', 'City General', 'NewPassw0rd1');
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows the backend error message and does not navigate on failure', async () => {
    const httpError = new HttpErrorResponse({
      status: 400,
      error: {
        success: false,
        data: null,
        error: { code: 'INVALID_REQUEST', message: 'Security answer did not match' },
      },
    });
    const resetPassword = vi.fn().mockRejectedValue(httpError);
    const { fixture, navigateSpy } = await setup({ resetPassword });
    const el = fixture.nativeElement as HTMLElement;

    submitWith(el, {
      email: 'asha@example.com',
      securityAnswer: 'Wrong Answer',
      newPassword: 'NewPassw0rd1',
      confirmNewPassword: 'NewPassw0rd1',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Security answer did not match');
  });

  it('blocks submission with inline field errors when the form is invalid, without calling resetPassword', async () => {
    const resetPassword = vi.fn();
    const { fixture } = await setup({ resetPassword });
    const el = fixture.nativeElement as HTMLElement;

    submitWith(el, { email: 'not-an-email', securityAnswer: '', newPassword: 'short', confirmNewPassword: 'different' });
    fixture.detectChanges();

    expect(el.textContent).toContain('Enter a valid email address.');
    expect(el.textContent).toContain('Security answer is required.');
    expect(el.textContent).toContain('Password must be at least 8 characters and contain a letter and a digit.');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('points the footer link to /login', async () => {
    const { fixture } = await setup();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]');
    expect(link).not.toBeNull();
  });
});
