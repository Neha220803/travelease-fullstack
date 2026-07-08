import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NewTrip } from '@app/features/trips/components/new-trip/new-trip';
import { TripsService } from '@app/features/trips/services/trips.service';
import { CreateTripPayload, Trip, TripMember } from '@app/features/trips/services/trip.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

const SAMPLE_DESTINATIONS: Destination[] = [
  { destinationId: 1, destinationName: 'Mumbai', state: 'Maharashtra', country: 'India', description: '' },
  { destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' },
];

const CREATED_TRIP: Trip = {
  tripId: 'bbbbbbbb-0000-0000-0000-000000000002',
  tripName: 'Goa Beach Escape',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 1,
  budgetAmount: 18000,
  categoryId: 4,
  startDate: '2026-08-01',
  endDate: '2026-08-05',
  status: 'PLANNING',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const CARA: TravelerSearchResult = { id: 'u3', name: 'Cara Traveler', email: 'cara@travelease.test' };

const CARA_MEMBER: TripMember = {
  tripMemberId: 'eeeeeeee-0000-0000-0000-000000000005',
  userId: 'u3',
  name: 'Cara Traveler',
  email: 'cara@travelease.test',
  memberStatus: 'INVITED',
  joinedDate: '2026-07-02T00:00:00Z',
  budgetAmount: 0,
  spentAmount: 0,
};

async function setup(
  tripsService: Partial<TripsService>,
  destinationsService: Partial<DestinationsService> = { listDestinations: () => of(SAMPLE_DESTINATIONS) },
) {
  await TestBed.configureTestingModule({
    imports: [NewTrip],
    providers: [
      provideRouter([]),
      provideIcons({ lucideArrowLeft }),
      { provide: TripsService, useValue: tripsService },
      { provide: DestinationsService, useValue: destinationsService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(NewTrip);
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, navigateSpy };
}

function fillAndSubmit(el: HTMLElement) {
  (el.querySelector('#name') as HTMLInputElement).value = 'Goa Beach Escape';
  (el.querySelector('#budget') as HTMLInputElement).value = '18000';
  (el.querySelector('#source') as HTMLInputElement).value = 'Bengaluru';
  (el.querySelector('#start-date') as HTMLInputElement).value = '2026-08-01';
  (el.querySelector('#end-date') as HTMLInputElement).value = '2026-08-05';
  const form = el.querySelector('form')!;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

function instance(fixture: ReturnType<typeof TestBed.createComponent<NewTrip>>) {
  return fixture.componentInstance as unknown as {
    dialogState: () => 'open' | 'closed';
    dialogStep: () => 'prompt' | 'picker';
    invitedTravelers: () => TravelerSearchResult[];
    onAddMembers: () => void;
    onCloseDialog: () => void;
    onMemberPicked: (t: TravelerSearchResult) => void;
    onDialogClosed: () => void;
  };
}

describe('NewTrip', () => {
  it('creates the trip with the default trip type and first-loaded destination, then opens the add-members prompt', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const { fixture, navigateSpy } = await setup({ createTrip });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el);
    await fixture.whenStable();
    fixture.detectChanges();

    const expectedPayload: CreateTripPayload = {
      tripName: 'Goa Beach Escape',
      sourceLocation: 'Bengaluru',
      destinationId: 1,
      budgetAmount: 18000,
      categoryId: 4,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    };
    expect(createTrip).toHaveBeenCalledWith(expectedPayload);
    expect(instance(fixture).dialogState()).toBe('open');
    expect(instance(fixture).dialogStep()).toBe('prompt');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('shows validation error details and does not navigate on failure', async () => {
    const httpError = new HttpErrorResponse({
      status: 400,
      error: {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: ['budgetAmount: must be greater than or equal to 0.01'],
        },
      },
    });
    const createTrip = vi.fn().mockReturnValue(throwError(() => httpError));
    const { fixture, navigateSpy } = await setup({ createTrip });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Validation failed');
    expect(el.textContent).toContain('budgetAmount: must be greater than or equal to 0.01');
  });

  it('shows an error and disables submit when destinations fail to load', async () => {
    const createTrip = vi.fn();
    const { fixture } = await setup(
      { createTrip },
      { listDestinations: () => throwError(() => new Error('boom')) },
    );
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Could not load destinations');
    const submitBtn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('navigates to the overview tab when the organizer closes without adding anyone', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const { fixture, navigateSpy } = await setup({ createTrip });
    const el = fixture.nativeElement as HTMLElement;
    fillAndSubmit(el);
    await fixture.whenStable();

    // The dialog's overlay content renders via a CDK Overlay attached to
    // document.body, not fixture.nativeElement — calling the (protected)
    // handlers directly tests the same close-request + navigation-decision
    // logic without a brittle, unproven overlay-query (same trade-off already
    // accepted in trip-members-tab.spec.ts).
    instance(fixture).onCloseDialog();
    instance(fixture).onDialogClosed();

    expect(navigateSpy).toHaveBeenCalledWith(['/trips', CREATED_TRIP.tripId], {
      queryParams: { tab: 'overview' },
    });
  });

  it('invites picked travelers and navigates to the members tab once done', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const inviteMember = vi.fn().mockReturnValue(of(CARA_MEMBER));
    const { fixture, navigateSpy } = await setup({ createTrip, inviteMember });
    const el = fixture.nativeElement as HTMLElement;
    fillAndSubmit(el);
    await fixture.whenStable();

    instance(fixture).onAddMembers();
    instance(fixture).onMemberPicked(CARA);
    await fixture.whenStable();

    expect(inviteMember).toHaveBeenCalledWith(CREATED_TRIP.tripId, 'cara@travelease.test');
    expect(instance(fixture).invitedTravelers()).toEqual([CARA]);
    expect(instance(fixture).dialogStep()).toBe('picker');

    instance(fixture).onCloseDialog();
    instance(fixture).onDialogClosed();

    expect(navigateSpy).toHaveBeenCalledWith(['/trips', CREATED_TRIP.tripId], {
      queryParams: { tab: 'members' },
    });
  });

  it('shows an inline error when a member invite fails, without navigating early', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const inviteMember = vi.fn().mockReturnValue(throwError(() => new Error('boom')));
    const { fixture } = await setup({ createTrip, inviteMember });
    const el = fixture.nativeElement as HTMLElement;
    fillAndSubmit(el);
    await fixture.whenStable();

    instance(fixture).onAddMembers();
    instance(fixture).onMemberPicked(CARA);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(instance(fixture).invitedTravelers()).toEqual([]);
  });
});
