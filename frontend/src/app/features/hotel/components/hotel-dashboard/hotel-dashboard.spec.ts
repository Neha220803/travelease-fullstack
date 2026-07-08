import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCalendarDays,
  lucideDoorOpen,
  lucideHotel,
  lucideStar,
  lucideWallet,
} from '@ng-icons/lucide';
import {
  HotelDashboard,
  buildCalendarDays,
  currentMonthDates,
  dailyOccupiedCount,
  leadingBlankCount,
  occupancyBackground,
} from '@app/features/hotel/components/hotel-dashboard/hotel-dashboard';
import { HotelBookingResponse, HotelProviderService } from '@app/features/hotel/services/hotel-provider.service';
import {
  availableRoomCount,
  bookingsToday as expectedBookingsToday,
  formatCompactCurrency,
  groupRooms,
  monthlyRevenue,
} from '@app/features/hotel/services/hotel-provider-view-models';
import {
  TEST_PROVIDER_OVERVIEW,
  createHotelProviderStub,
} from '@app/features/hotel/testing/hotel-provider-test-data';

describe('currentMonthDates', () => {
  it('returns one ISO date string per day in a 28-day month', () => {
    const dates = currentMonthDates(new Date(2026, 1, 1));
    expect(dates).toHaveLength(28);
    expect(dates[0]).toBe('2026-02-01');
    expect(dates[27]).toBe('2026-02-28');
  });

  it('handles a 31-day month', () => {
    const dates = currentMonthDates(new Date(2026, 6, 1));
    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe('2026-07-01');
    expect(dates[30]).toBe('2026-07-31');
  });
});

describe('leadingBlankCount', () => {
  it('returns 0 when the month starts on a Monday', () => {
    // 2026-06-01 is a Monday
    expect(leadingBlankCount(new Date(2026, 5, 1))).toBe(0);
  });

  it('returns 2 when the month starts on a Wednesday', () => {
    // 2026-07-01 is a Wednesday
    expect(leadingBlankCount(new Date(2026, 6, 1))).toBe(2);
  });

  it('returns 6 when the month starts on a Sunday', () => {
    // 2026-11-01 is a Sunday
    expect(leadingBlankCount(new Date(2026, 10, 1))).toBe(6);
  });
});

function booking(overrides: Partial<HotelBookingResponse>): HotelBookingResponse {
  return {
    hotelBookingId: 'b1',
    tripId: null,
    hotelId: 'hotel-1',
    hotelName: 'Sea Breeze Resort',
    bookedByUserId: 'user-1',
    bookedByUserName: 'Guest',
    checkInDate: '2026-07-05',
    checkOutDate: '2026-07-08',
    roomType: 'Deluxe',
    roomNumber: '101',
    totalAmount: 10000,
    bookingStatus: 'CONFIRMED',
    ...overrides,
  };
}

describe('dailyOccupiedCount', () => {
  const bookings = [
    booking({ checkInDate: '2026-07-05', checkOutDate: '2026-07-08' }),
    booking({ hotelBookingId: 'b2', checkInDate: '2026-07-01', checkOutDate: '2026-07-10' }),
    booking({ hotelBookingId: 'b3', checkInDate: '2026-07-05', checkOutDate: '2026-07-06', bookingStatus: 'CANCELLED' }),
  ];

  it('counts active bookings whose stay spans the given date', () => {
    expect(dailyOccupiedCount(bookings, '2026-07-05')).toBe(2);
  });

  it('excludes the checkout date itself (checkout day is not an occupied night)', () => {
    expect(dailyOccupiedCount(bookings, '2026-07-08')).toBe(1);
  });

  it('excludes cancelled bookings', () => {
    const onlyCancelled = [booking({ checkInDate: '2026-07-05', checkOutDate: '2026-07-08', bookingStatus: 'CANCELLED' })];
    expect(dailyOccupiedCount(onlyCancelled, '2026-07-05')).toBe(0);
  });

  it('returns 0 for a date outside every booking window', () => {
    expect(dailyOccupiedCount(bookings, '2026-06-01')).toBe(0);
  });
});

describe('buildCalendarDays', () => {
  it('computes a rounded occupancy percentage per day of the month', () => {
    const dates = ['2026-07-01', '2026-07-05', '2026-07-09'];
    const bookings = [booking({ checkInDate: '2026-07-05', checkOutDate: '2026-07-08' })];
    const days = buildCalendarDays(dates, bookings, 4);

    expect(days).toEqual([
      { day: 1, date: '2026-07-01', pct: 0 },
      { day: 2, date: '2026-07-05', pct: 25 },
      { day: 3, date: '2026-07-09', pct: 0 },
    ]);
  });

  it('returns 0% for every day when there are no rooms yet', () => {
    const days = buildCalendarDays(['2026-07-01'], [], 0);
    expect(days[0].pct).toBe(0);
  });
});

describe('occupancyBackground', () => {
  it('mixes --primary in proportion to the percentage', () => {
    expect(occupancyBackground(40)).toBe('color-mix(in oklch, var(--primary) 40%, var(--muted))');
  });

  it('clamps above 100 down to 100', () => {
    expect(occupancyBackground(140)).toBe('color-mix(in oklch, var(--primary) 100%, var(--muted))');
  });

  it('clamps below 0 up to 0', () => {
    expect(occupancyBackground(-10)).toBe('color-mix(in oklch, var(--primary) 0%, var(--muted))');
  });
});

describe('HotelDashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HotelDashboard],
      providers: [
        provideIcons({ lucideCalendarDays, lucideDoorOpen, lucideHotel, lucideStar, lucideWallet }),
        { provide: HotelProviderService, useValue: createHotelProviderStub() },
      ],
    }).compileComponents();
  });

  it('computes all 4 stat values from provider rooms and bookings', () => {
    const fixture = TestBed.createComponent(HotelDashboard);
    const c = fixture.componentInstance;

    expect(c.totalRooms()).toBe(TEST_PROVIDER_OVERVIEW.rooms.length);
    expect(c.availableRooms()).toBe(availableRoomCount(TEST_PROVIDER_OVERVIEW.rooms));
    expect(c.bookingsToday()).toBe(expectedBookingsToday(TEST_PROVIDER_OVERVIEW.bookings));
    expect(c.revenueMtd()).toBe(formatCompactCurrency(monthlyRevenue(TEST_PROVIDER_OVERVIEW.bookings)));
  });

  it('builds one calendar day per day of the current month, using real occupancy', () => {
    const fixture = TestBed.createComponent(HotelDashboard);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const expectedDates = currentMonthDates();

    expect(c.calendarDays()).toHaveLength(expectedDates.length);
    expect(c.calendarDays()[0].date).toBe(expectedDates[0]);
    expect(c.calendarDays().every((d) => d.pct >= 0 && d.pct <= 100)).toBe(true);
  });

  it('renders provider bookings in Recent Bookings', () => {
    const fixture = TestBed.createComponent(HotelDashboard);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sarathy R');
    expect(text).toContain('Anjali V');
    expect(fixture.componentInstance.recentBookings()).toHaveLength(2);
  });

  it('renders grouped room types with the correct available/total numbers', () => {
    const fixture = TestBed.createComponent(HotelDashboard);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const r of groupRooms(TEST_PROVIDER_OVERVIEW.rooms)) {
      expect(text).toContain(r.type);
      expect(text).toContain(`${r.available} / ${r.total}`);
    }
  });

  it('builds a room occupancy chart with the occupied percentage for every room type', () => {
    const fixture = TestBed.createComponent(HotelDashboard);
    const c = fixture.componentInstance;
    const options = c.roomInventoryOptions();
    const yAxis = options['yAxis'] as { data: string[] };
    const series = (options['series'] as any[])[0];

    for (const r of c.roomInventory()) {
      const idx = yAxis.data.indexOf(r.type);
      expect(series.data[idx]).toBe(Math.round(r.pct));
    }
  });

  it('renders the provider rating average and review count', () => {
    const fixture = TestBed.createComponent(HotelDashboard);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('4.3');
    expect(text).toContain('4 reviews');
  });

  it('builds a rating distribution chart with all 5 star percentages', () => {
    const fixture = TestBed.createComponent(HotelDashboard);
    const c = fixture.componentInstance;
    const options = c.ratingOptions();
    const yAxis = options['yAxis'] as { data: string[] };
    const series = (options['series'] as any[])[0];

    for (const row of c.ratingRows()) {
      const idx = yAxis.data.indexOf(`${row.stars}\u2605`);
      expect(series.data[idx]).toBe(row.pct);
    }
  });
});
