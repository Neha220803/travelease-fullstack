import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideMapPin, lucidePlus, lucideStar } from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import { HotelProperties } from '@app/features/hotel/components/hotel-properties/hotel-properties';
import { HotelProviderService } from '@app/features/hotel/services/hotel-provider.service';
import {
  TEST_PROVIDER_OVERVIEW,
  createHotelProviderStub,
} from '@app/features/hotel/testing/hotel-provider-test-data';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';

const SAMPLE_DESTINATIONS: Destination[] = [
  { destinationId: 1, destinationName: 'Mumbai', state: 'Maharashtra', country: 'India', description: '' },
  { destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' },
];

async function setup(
  destinationsService: Partial<DestinationsService> = { listDestinations: () => of(SAMPLE_DESTINATIONS) },
) {
  await TestBed.configureTestingModule({
    imports: [HotelProperties],
    providers: [
      provideIcons({ lucideMapPin, lucidePlus, lucideStar }),
      { provide: HotelProviderService, useValue: createHotelProviderStub() },
      { provide: DestinationsService, useValue: destinationsService },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(HotelProperties);
  fixture.detectChanges();
  return fixture;
}

describe('HotelProperties', () => {
  it('renders every provider hotel name, price, and rating', async () => {
    const fixture = await setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const h of TEST_PROVIDER_OVERVIEW.hotels) {
      expect(text).toContain(h.hotelName);
      expect(text).toContain(String(h.pricePerNight));
      expect(text).toContain(String(h.rating));
    }
  });

  it('defaults the new-property destination selection to the first loaded destination', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance.newDestinationId()).toBe('1');
  });

  it('resolves a destination id to a readable label', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance.destinationIdToLabel('2')).toBe('Goa, Goa');
  });

  it('seeds the edit-property destination selection from the hotel being edited', async () => {
    const fixture = await setup();
    const hotel = { ...TEST_PROVIDER_OVERVIEW.hotels[0], destinationId: 2 } as any;
    fixture.componentInstance.openEditProperty({
      id: hotel.hotelId,
      destinationId: 2,
      name: hotel.hotelName,
      address: hotel.address,
      area: 'Baga Beach',
      rating: 4.7,
      ratingLabel: '4.7',
      price: 4800,
      rooms: 2,
      amenities: hotel.amenities,
      image: '',
      status: 'Active',
      statusValue: 'ACTIVE',
    });
    expect(fixture.componentInstance.editDestinationId()).toBe('2');
  });

  it('flags destinationsError when the destinations request fails', async () => {
    const fixture = await setup({ listDestinations: () => throwError(() => new Error('boom')) });
    expect(fixture.componentInstance.destinationsError()).toBe(true);
    expect(fixture.componentInstance.destinationsLoading()).toBe(false);
  });
});
