import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideMapPin, lucideStar } from '@ng-icons/lucide';
import { of } from 'rxjs';
import { TripAccommodationTab } from '@app/features/trips/components/trip-detail/tabs/trip-accommodation-tab/trip-accommodation-tab';
import { HotelsService } from '@app/core/hotels/hotels.service';
import { AccommodationService } from '@app/features/trips/services/accommodation.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Hotel } from '@app/core/hotels/hotel.models';
import { Destination } from '@app/core/destinations/destination.models';
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

const HOTELS: Hotel[] = [
  {
    hotelId: 'h1',
    destinationId: 2,
    hotelName: 'Sea Breeze Resort',
    address: 'Baga Beach, Goa',
    rating: 4.7,
    pricePerNight: 4800,
    amenities: 'WiFi, Pool',
    status: 'ACTIVE',
    policies: 'No pets',
  },
  {
    hotelId: 'h2',
    destinationId: 2,
    hotelName: 'Calangute Grand',
    address: 'Calangute, Goa',
    rating: 4.5,
    pricePerNight: 5400,
    amenities: 'WiFi',
    status: 'ACTIVE',
    policies: 'No pets',
  },
];

const DESTINATIONS: Destination[] = [
  { destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' },
  { destinationId: 3, destinationName: 'Mumbai', state: 'Maharashtra', country: 'India', description: '' },
];

async function render(searchHotels = vi.fn().mockReturnValue(of(HOTELS))) {
  await TestBed.configureTestingModule({
    imports: [TripAccommodationTab],
    providers: [
      provideIcons({ lucideMapPin, lucideStar }),
      { provide: HotelsService, useValue: { searchHotels } },
      {
        provide: AccommodationService,
        useValue: {
          getAccommodationSummary: () => of({ tripId: 't1', bookingCount: 0, totalAmount: 0, bookings: [] }),
        },
      },
      { provide: DestinationsService, useValue: { listDestinations: () => of(DESTINATIONS) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripAccommodationTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function onDestinationChange(
  fixture: ReturnType<typeof TestBed.createComponent<TripAccommodationTab>>,
  value: string,
): void {
  (fixture.componentInstance as unknown as { onDestinationChange: (v: string) => void }).onDestinationChange(value);
}

describe('TripAccommodationTab', () => {
  it('auto-searches hotels by the trip destination on load', async () => {
    const searchHotels = vi.fn().mockReturnValue(of(HOTELS));
    await render(searchHotels);
    expect(searchHotels).toHaveBeenCalledWith(2, undefined);
  });

  it('renders every hotel returned by the search', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const h of HOTELS) {
      expect(text).toContain(h.hotelName);
    }
  });

  it('shows the Best Match badge only for the first hotel', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const count = (text.match(/Best Match/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('shows an empty state when no hotels are found', async () => {
    const fixture = await render(vi.fn().mockReturnValue(of([])));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No hotels found');
  });

  it('re-searches with the free-text query when Search is clicked', async () => {
    const searchHotels = vi.fn().mockReturnValue(of(HOTELS));
    const fixture = await render(searchHotels);
    searchHotels.mockClear();

    const queryInput = (fixture.nativeElement as HTMLElement).querySelector('#query') as HTMLInputElement;
    queryInput.value = 'sea';
    const searchButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Search',
    )!;
    searchButton.click();

    expect(searchHotels).toHaveBeenCalledWith(2, 'sea');
  });

  it('searches the newly selected destination once changed and Search is clicked', async () => {
    const searchHotels = vi.fn().mockReturnValue(of(HOTELS));
    const fixture = await render(searchHotels);
    searchHotels.mockClear();

    onDestinationChange(fixture, '3');
    const queryInput = (fixture.nativeElement as HTMLElement).querySelector('#query') as HTMLInputElement;
    const searchButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Search',
    )!;
    searchButton.click();

    expect(searchHotels).toHaveBeenCalledWith(3, queryInput.value || undefined);
  });
});
