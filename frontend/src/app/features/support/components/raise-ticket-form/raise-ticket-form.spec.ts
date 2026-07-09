import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RaiseTicketForm } from '@app/features/support/components/raise-ticket-form/raise-ticket-form';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { CreateTicketPayload, SupportTicket } from '@app/features/support/services/support-ticket.models';

const CREATED_TICKET: SupportTicket = {
  ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
  userId: 'bbbbbbbb-0000-0000-0000-000000000002',
  userName: 'Alice Traveler',
  category: 'OTHER',
  subject: 'App keeps crashing',
  description: 'The app crashes every time I open trip details.',
  status: 'OPEN',
  createdAt: '2026-07-09T00:00:00Z',
  updatedAt: '2026-07-09T00:00:00Z',
};

async function setup(supportTicketService: Partial<SupportTicketService>) {
  await TestBed.configureTestingModule({
    imports: [RaiseTicketForm],
    providers: [
      provideRouter([]),
      provideIcons({ lucideArrowLeft }),
      { provide: SupportTicketService, useValue: supportTicketService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(RaiseTicketForm);
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, navigateSpy };
}

function fillAndSubmit(el: HTMLElement, subject: string, description: string) {
  (el.querySelector('#subject') as HTMLInputElement).value = subject;
  (el.querySelector('#description') as HTMLTextAreaElement).value = description;
  const form = el.querySelector('form')!;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

describe('RaiseTicketForm', () => {
  it('submits the ticket with the selected category and navigates to My Tickets', async () => {
    const createTicket = vi.fn().mockReturnValue(of(CREATED_TICKET));
    const { fixture, navigateSpy } = await setup({ createTicket });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, 'App keeps crashing', 'The app crashes every time I open trip details.');
    await fixture.whenStable();
    fixture.detectChanges();

    const expectedPayload: CreateTicketPayload = {
      category: 'OTHER',
      subject: 'App keeps crashing',
      description: 'The app crashes every time I open trip details.',
    };
    expect(createTicket).toHaveBeenCalledWith(expectedPayload);
    expect(navigateSpy).toHaveBeenCalledWith(['/support/tickets']);
  });

  it('shows a validation error and does not submit when the fields are blank', async () => {
    const createTicket = vi.fn();
    const { fixture } = await setup({ createTicket });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, '', '');
    fixture.detectChanges();

    expect(createTicket).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Please fill in both the subject and description.');
  });

  it('shows the server error message and does not navigate on failure', async () => {
    const httpError = new HttpErrorResponse({
      status: 400,
      error: { success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Subject is required' } },
    });
    const createTicket = vi.fn().mockReturnValue(throwError(() => httpError));
    const { fixture, navigateSpy } = await setup({ createTicket });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, 'Subject', 'Description');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Subject is required');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
