import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideCheckCircle2, lucideClock, lucidePlus, lucideSparkles, lucideX } from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import { TripItineraryTab } from '@app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { Activity, ActivityProviderOption } from '@app/core/activities/activity.models';
import { ItineraryItem, ItineraryProgress } from '@app/features/trips/services/itinerary.models';
import { Trip } from '@app/features/trips/services/trip.models';

const TRIP: Trip = {
  tripId: 't1',
  tripName: 'Test Trip',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 2,
  budgetAmount: 40000,
  categoryId: 4,
  startDate: '2026-07-12',
  endDate: '2026-07-16',
  status: 'CONFIRMED',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const PROVIDERS: ActivityProviderOption[] = [
  { providerId: 202, providerName: 'Goa Watersports Owner' },
  { providerId: 210, providerName: 'Reef Divers Co' },
];

const ACTIVITIES: Activity[] = [
  {
    activityId: 'a1',
    providerId: 202,
    destinationId: 2,
    activityName: 'Scuba Diving',
    durationHours: 3,
    startTime: '09:00',
    endTime: '12:00',
    description: '',
  },
  {
    activityId: 'a3',
    providerId: 210,
    destinationId: 2,
    activityName: 'Reef Snorkeling',
    durationHours: 2,
    startTime: '08:00',
    endTime: '10:00',
    description: '',
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

async function render(
  itineraryService: Partial<ItineraryService> = {},
  activitiesService: Partial<ActivitiesService> = {},
) {
  await TestBed.configureTestingModule({
    imports: [TripItineraryTab],
    providers: [
      provideIcons({ lucideClock, lucidePlus, lucideSparkles, lucideCheckCircle2, lucideX }),
      {
        provide: ActivitiesService,
        useValue: {
          getActivities: () => of(ACTIVITIES),
          getProviders: () => of(PROVIDERS),
          ...activitiesService,
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

function days(fixture: ReturnType<typeof TestBed.createComponent<TripItineraryTab>>): ItineraryDay[] {
  return (fixture.componentInstance as unknown as { days: () => ItineraryDay[] }).days();
}

describe('TripItineraryTab', () => {
  it('groups itinerary items by day, numbered from the trip start date', async () => {
    const fixture = await render();
    const result = days(fixture);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(2);
    expect(result[0].items[0].activityName).toBe('Sunset Walk');
  });

  it('defaults the provider selection to the first provider and shows only their activities', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(
      (fixture.componentInstance as unknown as { selectedProviderId: () => number | null }).selectedProviderId(),
    ).toBe(202);
    expect(text).toContain('Scuba Diving');
    expect(text).not.toContain('Reef Snorkeling');
  });

  it('switches the activity list when a different provider is selected', async () => {
    const fixture = await render();
    (
      fixture.componentInstance as unknown as { onProviderChange: (id: string) => void }
    ).onProviderChange('210');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Reef Snorkeling');
    expect(text).not.toContain('Scuba Diving');
  });

  it('shows a message when the destination has no activity providers yet', async () => {
    const fixture = await render({}, { getProviders: () => of([]) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No activity providers for this destination yet');
  });

  it('creates an itinerary item dated to the trip start date when the sidebar + is clicked', async () => {
    const create = vi.fn().mockReturnValue(of({ ...ITEMS[0], itineraryId: 'i2', activityId: 'a1' }));
    const fixture = await render({ list: () => of([]), create });

    const addButton = (fixture.nativeElement as HTMLElement).querySelector('button.w-7') as HTMLButtonElement;
    expect(addButton).not.toBeNull();
    addButton.click();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith({
      tripId: 't1',
      activityId: 'a1',
      activityDate: '2026-07-12',
      status: 'Pending',
    });
  });

  it('creates the itinerary item on the date picked once the date picker changes', async () => {
    const create = vi.fn().mockReturnValue(of({ ...ITEMS[0], itineraryId: 'i2', activityId: 'a1' }));
    const fixture = await render({ list: () => of([]), create });

    (fixture.componentInstance as unknown as { onAddDateChange: (date: Date) => void }).onAddDateChange(
      new Date(2026, 6, 14),
    );
    const addButton = (fixture.nativeElement as HTMLElement).querySelector('button.w-7') as HTMLButtonElement;
    addButton.click();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith({
      tripId: 't1',
      activityId: 'a1',
      activityDate: '2026-07-14',
      status: 'Pending',
    });
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

    const fakeForm = { reset: vi.fn() } as unknown as HTMLFormElement;
    const fakeEvent = { preventDefault: () => {} } as Event;
    (
      fixture.componentInstance as unknown as {
        onAddCustomActivity: (e: Event, f: HTMLFormElement, name: string) => void;
      }
    ).onAddCustomActivity(fakeEvent, fakeForm, 'My own beach walk');
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

    const fakeForm = { reset: vi.fn() } as unknown as HTMLFormElement;
    const fakeEvent = { preventDefault: () => {} } as Event;
    (
      fixture.componentInstance as unknown as {
        onAddCustomActivity: (e: Event, f: HTMLFormElement, name: string) => void;
      }
    ).onAddCustomActivity(fakeEvent, fakeForm, '   ');

    expect(create).not.toHaveBeenCalled();
    expect(
      (fixture.componentInstance as unknown as { customAddError: () => string | null }).customAddError(),
    ).toBe('Enter a name for your planned activity.');
  });

  it('renders the completion progress bar from the backend summary', async () => {
    const fixture = await render({
      getProgress: () => of({ ...PROGRESS, completedActivities: 1, completionPercentage: 100 }),
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 / 1 activities completed');
    expect(text).toContain('100%');
  });

  it('toggles an item to Completed and refreshes progress', async () => {
    const update = vi.fn().mockReturnValue(of({ ...ITEMS[0], status: 'Completed' }));
    const getProgress = vi
      .fn()
      .mockReturnValueOnce(of(PROGRESS))
      .mockReturnValueOnce(of({ ...PROGRESS, completedActivities: 1, completionPercentage: 100 }));
    const fixture = await render({ update, getProgress });

    (fixture.componentInstance as unknown as { toggleStatus: (item: ItineraryItem) => void }).toggleStatus(
      ITEMS[0],
    );
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

    (fixture.componentInstance as unknown as { deleteItem: (item: ItineraryItem) => void }).deleteItem(
      ITEMS[0],
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(remove).toHaveBeenCalledWith('i1');
    expect(days(fixture)).toHaveLength(0);
  });

  it('shows an error when deleting fails (e.g. non-organizer)', async () => {
    const remove = vi.fn().mockReturnValue(throwError(() => new Error('Forbidden')));
    const fixture = await render({ remove });

    (fixture.componentInstance as unknown as { deleteItem: (item: ItineraryItem) => void }).deleteItem(
      ITEMS[0],
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Only the trip organizer can delete itinerary items.');
  });
});
