import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideClock,
  lucideLoader2,
  lucidePlus,
  lucideSparkles,
  lucideX,
} from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import {
  TripItineraryTab,
  validatePaymentDraft,
  generateBookingReference,
  ACTIVITY_PROVIDERS,
  PaymentDraft,
} from '@app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { ActivityRecommendation } from '@app/core/recommendations/recommendation.models';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ItineraryItem, ItineraryProgress } from '@app/features/trips/services/itinerary.models';
import { Trip } from '@app/features/trips/services/trip.models';

const TRIP: Trip = {
  tripId: 't1',
  tripName: 'Test Trip',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 2,
  budgetAmount: 40000,
  categoryId: 1,
  startDate: '2026-07-12',
  endDate: '2026-07-16',
  status: 'CONFIRMED',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const RECOMMENDATIONS: ActivityRecommendation[] = [
  {
    recommendationId: 'r1',
    categoryId: 1,
    recommendationType: 'Activity',
    referenceId: 'a1',
    rankOrder: 1,
    activityId: 'a1',
    activityName: 'Sunset Beach Bonfire',
    providerName: 'Skyline Adventures',
    price: 1500,
    startTime: '18:00',
    endTime: '21:00',
    destinationId: 2,
  },
  {
    recommendationId: 'r2',
    categoryId: 1,
    recommendationType: 'Activity',
    referenceId: 'a2',
    rankOrder: 2,
    activityId: 'a2',
    activityName: 'Backwater Cruise',
    providerName: 'WanderNest Travels',
    price: 4000,
    startTime: '09:00',
    endTime: '13:00',
    destinationId: 2,
  },
];

const ITEMS: ItineraryItem[] = [
  {
    itineraryId: 'i1',
    tripId: 't1',
    activityId: 'a2',
    activityName: 'Sunset Walk',
    activityDate: '2026-07-13',
    startTime: null,
    endTime: null,
    status: 'Pending',
    completionTime: null,
  },
];

const PROGRESS: ItineraryProgress = {
  tripId: 't1',
  totalActivities: 1,
  completedActivities: 0,
  pendingActivities: 1,
  completionPercentage: 0,
};

const VALID_PAYMENT: PaymentDraft = { cardNumber: '4111111111111111', expiry: '07/28', cvv: '123' };

async function render(
  itineraryService: Partial<ItineraryService> = {},
  recommendationsService: Partial<RecommendationsService> = {},
) {
  await TestBed.configureTestingModule({
    imports: [TripItineraryTab],
    providers: [
      provideIcons({ lucideClock, lucidePlus, lucideSparkles, lucideCheckCircle2, lucideX, lucideLoader2 }),
      {
        provide: RecommendationsService,
        useValue: {
          getActivityRecommendations: () => of(RECOMMENDATIONS),
          ...recommendationsService,
        },
      },
      {
        provide: ItineraryService,
        useValue: {
          list: () => of(ITEMS),
          create: vi.fn(),
          update: vi.fn(),
          remove: vi.fn(),
          getProgress: () => of(PROGRESS),
          ...itineraryService,
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripItineraryTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

interface ItineraryDay {
  day: number;
  date: string;
  items: ItineraryItem[];
}

function instance(fixture: ReturnType<typeof TestBed.createComponent<TripItineraryTab>>) {
  return fixture.componentInstance as unknown as {
    days: () => ItineraryDay[];
    selectedProvider: () => string | null;
    selectProvider: (name: string) => void;
    activitiesForProvider: () => ActivityRecommendation[];
    openBooking: (a: ActivityRecommendation) => void;
    bookingDialogState: () => string;
    bookingStage: () => 'form' | 'success';
    selectedActivity: () => ActivityRecommendation | null;
    paymentDraft: () => PaymentDraft;
    paymentTouched: () => Record<string, boolean>;
    paymentErrors: () => Record<string, string>;
    paymentValid: () => boolean;
    updatePaymentField: (field: string, value: string) => void;
    markPaymentTouched: (field: string) => void;
    confirmAndPay: () => void;
    paying: () => boolean;
    bookingReference: () => string | null;
    addToItinerary: () => void;
    addingToItinerary: () => boolean;
    cancelBooking: () => void;
    markComplete: (item: ItineraryItem) => void;
    deleteItem: (item: ItineraryItem) => void;
    customAddError: () => string | null;
    onAddCustomActivity: (e: Event, f: HTMLFormElement, name: string) => void;
  };
}

describe('validatePaymentDraft', () => {
  it('accepts a fully valid draft', () => {
    expect(validatePaymentDraft(VALID_PAYMENT)).toEqual({});
  });

  it('requires a 12-16 digit card number', () => {
    expect(validatePaymentDraft({ ...VALID_PAYMENT, cardNumber: '' }).cardNumber).toBe(
      'Card number is required',
    );
    expect(validatePaymentDraft({ ...VALID_PAYMENT, cardNumber: '123' }).cardNumber).toBe(
      'Card number must be 12-16 digits',
    );
    expect(validatePaymentDraft({ ...VALID_PAYMENT, cardNumber: '12345678901234567' }).cardNumber).toBe(
      'Card number must be 12-16 digits',
    );
    expect(validatePaymentDraft({ ...VALID_PAYMENT, cardNumber: '123456789012' }).cardNumber).toBeUndefined();
  });

  it('requires MM/YY expiry format', () => {
    expect(validatePaymentDraft({ ...VALID_PAYMENT, expiry: '' }).expiry).toBe('Expiry is required');
    expect(validatePaymentDraft({ ...VALID_PAYMENT, expiry: '13/28' }).expiry).toBe(
      'Expiry must be in MM/YY format',
    );
    expect(validatePaymentDraft({ ...VALID_PAYMENT, expiry: '7/28' }).expiry).toBe(
      'Expiry must be in MM/YY format',
    );
  });

  it('requires an exactly-3-digit CVV', () => {
    expect(validatePaymentDraft({ ...VALID_PAYMENT, cvv: '' }).cvv).toBe('CVV is required');
    expect(validatePaymentDraft({ ...VALID_PAYMENT, cvv: '12' }).cvv).toBe('CVV must be exactly 3 digits');
    expect(validatePaymentDraft({ ...VALID_PAYMENT, cvv: '1234' }).cvv).toBe('CVV must be exactly 3 digits');
  });
});

describe('generateBookingReference', () => {
  it('produces a BK- prefixed 6-digit reference', () => {
    expect(generateBookingReference()).toMatch(/^BK-\d{6}$/);
  });
});

describe('TripItineraryTab', () => {
  it('groups itinerary items by day, numbered from the trip start date', async () => {
    const fixture = await render();
    const result = instance(fixture).days();
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(2);
    expect(result[0].items[0].activityName).toBe('Sunset Walk');
  });

  it('lists all three fixed activity providers', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const provider of ACTIVITY_PROVIDERS) {
      expect(text).toContain(provider);
    }
  });

  it('shows no activities until a provider is selected', async () => {
    const fixture = await render();
    expect(instance(fixture).activitiesForProvider()).toHaveLength(0);
  });

  it('filters recommended activities to the selected provider', async () => {
    const fixture = await render();
    instance(fixture).selectProvider('Skyline Adventures');
    fixture.detectChanges();
    const activities = instance(fixture).activitiesForProvider();
    expect(activities).toHaveLength(1);
    expect(activities[0].activityName).toBe('Sunset Beach Bonfire');
  });

  it('opens the booking confirmation dialog with the correct activity and price when one is selected', async () => {
    const fixture = await render();
    const c = instance(fixture);
    c.selectProvider('Skyline Adventures');
    fixture.detectChanges();
    c.openBooking(c.activitiesForProvider()[0]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(c.bookingDialogState()).toBe('open');
    expect(c.bookingStage()).toBe('form');
    expect(c.selectedActivity()?.activityName).toBe('Sunset Beach Bonfire');
    // hlm-dialog-content is portal-rendered (CDK overlay) outside fixture.nativeElement.
    const text = document.body.textContent ?? '';
    expect(text).toContain('Booking Confirmation');
    expect(text).toContain('1,500');
  });

  it('does not show payment errors before a field is touched', async () => {
    const fixture = await render();
    const c = instance(fixture);
    c.openBooking(RECOMMENDATIONS[0]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Card number is required');
  });

  it('shows a payment field error only after it is touched', async () => {
    const fixture = await render();
    const c = instance(fixture);
    c.openBooking(RECOMMENDATIONS[0]);
    expect(c.paymentErrors()['cardNumber']).toBe('Card number is required');
    c.markPaymentTouched('cardNumber');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    // hlm-dialog-content is portal-rendered (CDK overlay) outside fixture.nativeElement.
    expect(document.body.textContent).toContain('Card number is required');
  });

  it('keeps Confirm & Pay disabled until all payment fields are valid', async () => {
    const fixture = await render();
    const c = instance(fixture);
    c.openBooking(RECOMMENDATIONS[0]);
    expect(c.paymentValid()).toBe(false);
    c.updatePaymentField('cardNumber', VALID_PAYMENT.cardNumber);
    c.updatePaymentField('expiry', VALID_PAYMENT.expiry);
    c.updatePaymentField('cvv', VALID_PAYMENT.cvv);
    expect(c.paymentValid()).toBe(true);
  });

  it('shows a loading spinner while paying, then the success screen with a BK- reference', async () => {
    vi.useFakeTimers();
    const fixture = await render();
    const c = instance(fixture);
    c.openBooking(RECOMMENDATIONS[0]);
    c.updatePaymentField('cardNumber', VALID_PAYMENT.cardNumber);
    c.updatePaymentField('expiry', VALID_PAYMENT.expiry);
    c.updatePaymentField('cvv', VALID_PAYMENT.cvv);

    c.confirmAndPay();
    expect(c.paying()).toBe(true);
    expect(c.bookingStage()).toBe('form');

    vi.advanceTimersByTime(1500);
    expect(c.paying()).toBe(false);
    expect(c.bookingStage()).toBe('success');
    expect(c.bookingReference()).toMatch(/^BK-\d{6}$/);
    vi.useRealTimers();
  });

  it('adds the booked activity to the itinerary, refreshes the list/progress, and closes the dialog', async () => {
    vi.useFakeTimers();
    const create = vi.fn().mockReturnValue(
      of({
        itineraryId: 'i2',
        tripId: 't1',
        activityId: 'a1',
        activityName: 'Sunset Beach Bonfire',
        activityDate: '2026-07-12',
        startTime: '2026-07-12T18:00:00',
        endTime: '2026-07-12T21:00:00',
        status: 'Pending',
        completionTime: null,
      }),
    );
    const getProgress = vi
      .fn()
      .mockReturnValueOnce(of(PROGRESS))
      .mockReturnValueOnce(of({ ...PROGRESS, totalActivities: 2 }));
    const fixture = await render({ create, getProgress });
    const c = instance(fixture);

    c.openBooking(RECOMMENDATIONS[0]);
    c.updatePaymentField('cardNumber', VALID_PAYMENT.cardNumber);
    c.updatePaymentField('expiry', VALID_PAYMENT.expiry);
    c.updatePaymentField('cvv', VALID_PAYMENT.cvv);
    c.confirmAndPay();
    vi.advanceTimersByTime(1500);
    vi.useRealTimers();
    expect(c.bookingStage()).toBe('success');

    c.addToItinerary();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith({
      tripId: 't1',
      activityId: 'a1',
      activityDate: '2026-07-12',
      startTime: '2026-07-12T18:00:00',
      endTime: '2026-07-12T21:00:00',
      status: 'Pending',
    });
    expect(c.bookingDialogState()).toBe('closed');
    expect(getProgress).toHaveBeenCalledTimes(2);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sunset Beach Bonfire');
  });

  it('cancels the booking dialog without adding anything', async () => {
    const create = vi.fn();
    const fixture = await render({ create });
    const c = instance(fixture);
    c.openBooking(RECOMMENDATIONS[0]);
    c.cancelBooking();
    expect(c.bookingDialogState()).toBe('closed');
    expect(create).not.toHaveBeenCalled();
  });

  it('adds a custom (non-seeded) activity by name via the "Add Your Own" dialog', async () => {
    const create = vi.fn().mockReturnValue(
      of({
        itineraryId: 'i3',
        tripId: 't1',
        activityId: 'custom-abc',
        activityName: 'My own beach walk',
        activityDate: '2026-07-12',
        startTime: null,
        endTime: null,
        status: 'Pending',
        completionTime: null,
      }),
    );
    const fixture = await render({ list: () => of([]), create });
    const c = instance(fixture);

    const fakeForm = { reset: vi.fn() } as unknown as HTMLFormElement;
    const fakeEvent = { preventDefault: () => {} } as Event;
    c.onAddCustomActivity(fakeEvent, fakeForm, 'My own beach walk');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith({
      tripId: 't1',
      activityName: 'My own beach walk',
      activityDate: '2026-07-12',
      status: 'Pending',
    });
    expect(fakeForm.reset).toHaveBeenCalled();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('My own beach walk');
  });

  it('rejects a blank custom activity name without calling the backend', async () => {
    const create = vi.fn();
    const fixture = await render({ create });
    const c = instance(fixture);

    const fakeForm = { reset: vi.fn() } as unknown as HTMLFormElement;
    const fakeEvent = { preventDefault: () => {} } as Event;
    c.onAddCustomActivity(fakeEvent, fakeForm, '   ');

    expect(create).not.toHaveBeenCalled();
    expect(c.customAddError()).toBe('Enter a name for your planned activity.');
  });

  it('renders the completion progress bar from the backend summary', async () => {
    const fixture = await render({
      getProgress: () => of({ ...PROGRESS, completedActivities: 1, completionPercentage: 100 }),
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 / 1 activities completed');
    expect(text).toContain('100%');
  });

  it('marks a Pending item Completed via "Mark as Complete" and refreshes progress', async () => {
    const update = vi.fn().mockReturnValue(of({ ...ITEMS[0], status: 'Completed' }));
    const getProgress = vi
      .fn()
      .mockReturnValueOnce(of(PROGRESS))
      .mockReturnValueOnce(of({ ...PROGRESS, completedActivities: 1, completionPercentage: 100 }));
    const fixture = await render({ update, getProgress });
    const c = instance(fixture);

    c.markComplete(ITEMS[0]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(update).toHaveBeenCalledWith('i1', {
      tripId: 't1',
      activityId: 'a2',
      activityDate: '2026-07-13',
      status: 'Completed',
    });
    expect(getProgress).toHaveBeenCalledTimes(2);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Completed');
  });

  it('removes an item from the list on successful delete', async () => {
    const remove = vi.fn().mockReturnValue(of(undefined));
    const fixture = await render({ remove });
    const c = instance(fixture);

    c.deleteItem(ITEMS[0]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(remove).toHaveBeenCalledWith('i1');
    expect(c.days()).toHaveLength(0);
  });

  it('shows an error when deleting fails (e.g. non-organizer)', async () => {
    const remove = vi.fn().mockReturnValue(throwError(() => new Error('Forbidden')));
    const fixture = await render({ remove });
    const c = instance(fixture);

    c.deleteItem(ITEMS[0]);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Only the trip organizer can delete itinerary items.');
  });
});
