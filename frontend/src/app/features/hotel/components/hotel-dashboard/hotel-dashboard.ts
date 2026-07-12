import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { EChart } from '@app/shared/ui/echart/echart';
import { NotificationService } from '@app/features/notifications/services/notification.service';
import { NotificationResponse } from '@app/features/notifications/services/notification.models';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CHART_COLORS } from '@app/shared/ui/echart/echart-theme';
import { buildRankingBarOption } from '@app/shared/ui/echart/ranking-bar-chart';
import { WorkspaceSearchService } from '@app/shared/services/workspace-search.service';
import {
  EMPTY_PROVIDER_OVERVIEW,
  HotelBookingResponse,
  HotelProviderService,
  ProviderOverview,
} from '@app/features/hotel/services/hotel-provider.service';
import {
  HotelBookingView,
  RatingRow,
  RoomInventoryView,
  availableRoomCount,
  averageRating,
  bookingsToday,
  buildRatingRows,
  filterProviderOverview,
  formatCompactCurrency,
  groupRooms,
  isActiveBooking,
  mapBookingRows,
  monthlyRevenue,
  providerSubtitle,
} from '@app/features/hotel/services/hotel-provider-view-models';
import type { EChartsCoreOption } from 'echarts/core';
import { catchError, combineLatest, of } from 'rxjs';

export interface CalendarDayView {
  day: number;
  date: string;
  pct: number;
}

export function currentMonthDates(referenceDate = new Date()): string[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`);
}

/** Count of blank lead-in cells so day 1 lands under its real Monday-first weekday column. */
export function leadingBlankCount(referenceDate = new Date()): number {
  const firstOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  return (firstOfMonth.getDay() + 6) % 7;
}

export function dailyOccupiedCount(bookings: HotelBookingResponse[], date: string): number {
  return bookings.filter(
    (b) => isActiveBooking(b) && b.checkInDate <= date && date < b.checkOutDate,
  ).length;
}

export function buildCalendarDays(
  dates: string[],
  bookings: HotelBookingResponse[],
  totalRooms: number,
): CalendarDayView[] {
  return dates.map((date, i) => {
    const occupied = dailyOccupiedCount(bookings, date);
    const pct = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
    return { day: i + 1, date, pct };
  });
}

/** Theme-aware heat tint: interpolates from --muted (0%) to --primary (100%) via CSS color-mix. */
export function occupancyBackground(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  return `color-mix(in oklch, var(--primary) ${clamped}%, var(--muted))`;
}

@Component({
  selector: 'app-hotel-dashboard',
  imports: [NgIcon, HlmCardImports, PageHeader, StatusBadge, EChart, RouterLink, DatePipe],
  templateUrl: './hotel-dashboard.html',
})
export class HotelDashboard {
  private readonly hotelProvider = inject(HotelProviderService);
  private readonly workspaceSearch = inject(WorkspaceSearchService);
  private readonly notificationService = inject(NotificationService);

  public readonly totalRooms = signal(0);
  public readonly availableRooms = signal(0);
  public readonly bookingsToday = signal(0);
  public readonly revenueMtd = signal(formatCompactCurrency(0));
  public readonly dashboardSubtitle = signal('Live hotel performance and inventory.');

  private readonly calendarDates = currentMonthDates();
  public readonly calendarMonthLabel = new Date().toLocaleString('en-US', { month: 'long' });
  public readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  public readonly leadingBlanks: number[] = Array.from({ length: leadingBlankCount() }, (_, i) => i);
  public readonly calendarDays = signal<CalendarDayView[]>(buildCalendarDays(this.calendarDates, [], 0));
  public readonly occupancyBackground = occupancyBackground;

  public readonly recentBookings = signal<HotelBookingView[]>([]);
  public readonly roomInventory = signal<RoomInventoryView[]>([]);
  public readonly roomInventoryOptions = signal<EChartsCoreOption>(buildRoomInventoryOptions([]));
  public readonly ratingAverage = signal('0.0');
  public readonly ratingCount = signal(0);
  public readonly ratingRows = signal<RatingRow[]>(buildRatingRows([]));
  public readonly ratingOptions = signal<EChartsCoreOption>(buildRatingOptions(buildRatingRows([])));
  public readonly notifications = signal<NotificationResponse[]>([]);

  constructor() {
    combineLatest([
      this.hotelProvider.getProviderOverview().pipe(catchError(() => of(EMPTY_PROVIDER_OVERVIEW))),
      this.workspaceSearch.hotelQuery$,
    ])
      .pipe(takeUntilDestroyed())
      .subscribe(([overview, query]) => this.applyOverview(filterProviderOverview(overview, query)));

    this.notificationService.getNotifications()
      .pipe(takeUntilDestroyed())
      .subscribe((notifs) => {
        this.notifications.set(notifs.slice(0, 5));
      });
  }

  private applyOverview(overview: ProviderOverview): void {
    const totalRooms = overview.rooms.length;
    this.totalRooms.set(totalRooms);
    this.availableRooms.set(availableRoomCount(overview.rooms));
    this.bookingsToday.set(bookingsToday(overview.bookings));
    this.revenueMtd.set(formatCompactCurrency(monthlyRevenue(overview.bookings)));
    this.dashboardSubtitle.set(providerSubtitle(overview.hotels));

    this.recentBookings.set(mapBookingRows(overview.bookings).slice(0, 4));
    const roomInventory = groupRooms(overview.rooms);
    this.roomInventory.set(roomInventory);
    this.roomInventoryOptions.set(buildRoomInventoryOptions(roomInventory));
    this.calendarDays.set(buildCalendarDays(this.calendarDates, overview.bookings, totalRooms));

    this.ratingAverage.set(averageRating(overview).toFixed(1));
    this.ratingCount.set(overview.reviews.length);
    const ratingRows = buildRatingRows(overview.reviews);
    this.ratingRows.set(ratingRows);
    this.ratingOptions.set(buildRatingOptions(ratingRows));
  }
}

function buildRoomInventoryOptions(roomInventory: RoomInventoryView[]): EChartsCoreOption {
  return buildRankingBarOption(
    roomInventory.map((r) => ({ label: r.type, value: Math.round(r.pct) })),
    CHART_COLORS.primary,
    '%',
  );
}

function buildRatingOptions(ratingRows: RatingRow[]): EChartsCoreOption {
  return buildRankingBarOption(
    ratingRows.map((r) => ({ label: `${r.stars}\u2605`, value: r.pct })),
    CHART_COLORS.warning,
    '%',
  );
}
