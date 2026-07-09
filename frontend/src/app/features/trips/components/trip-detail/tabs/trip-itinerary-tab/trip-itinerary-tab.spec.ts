import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideCheckCircle2, lucideClock, lucidePlus, lucideSparkles, lucideX } from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import { TripItineraryTab } from '@app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { Activity } from '@app/core/activities/activity.models';
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

const ACTIVITIES: Activity[] = [
  {
    activityId: 'a1',
    destinationId: 2,
    activityName: 'Scuba Diving',
    durationHours: 3,
    startTime: '09:00',
    endTime: '12:00',
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

async function render(itineraryService: Partial<ItineraryService> = {}) {
  await TestBed.configureTestingModule({
    imports: [TripItineraryTab],
    providers: [
      provideIcons({ lucideClock, lucidePlus, lucideSparkles, lucideCheckCircle2, lucideX }),
      { provide: ActivitiesService, useValue: { getActivities: () => of(ACTIVITIES) } },
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

  it('renders every available activity in the sidebar', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Scuba Diving');
  });

  it('creates an itinerary item dated to the trip start date when the sidebar + is clicked', async () => {
    const create = vi.fn().mockReturnValue(of({ ...ITEMS[0], itineraryId: 'i2', activityId: 'a1' }));
    const fixture = await render({ list: () => of([]), create });

    // Two buttons render a lucidePlus icon: the decorative header "Add Activity"
    // button (no click handler) and the sidebar's per-activity "+" (which
    // actually calls onAddActivity). Both get "h-7" from the shared size="sm"
    // button variant, so that alone isn't unique — but only the sidebar button
    // is also a square icon button (w-7 p-0, from the "h-7 w-7 p-0" template
    // classes), so scope the query to that instead.
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

  it('defaults the header dialog activity selection to the first available activity', async () => {
    const fixture = await render();
    expect(
      (fixture.componentInstance as unknown as { selectedActivityId: () => string }).selectedActivityId(),
    ).toBe('a1');
  });

  it('adds the selected activity when the header "Add Activity" dialog is submitted', async () => {
    const create = vi.fn().mockReturnValue(of({ ...ITEMS[0], itineraryId: 'i2', activityId: 'a1' }));
    const fixture = await render({ create });

    (
      fixture.componentInstance as unknown as { onAddActivitySubmit: () => void }
    ).onAddActivitySubmit();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith({
      tripId: 't1',
      activityId: 'a1',
      activityDate: '2026-07-12',
      status: 'Pending',
    });
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
