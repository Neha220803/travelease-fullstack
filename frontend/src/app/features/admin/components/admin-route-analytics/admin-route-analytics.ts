import { Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { routeAnalytics } from '@app/core/mock-data';

interface RouteRow {
  route: string;
  bookings: number;
  revenue: number;
  cancellation: number;
  cancellationClass: string;
  duration: string;
}

function cancellationClass(cancellation: number): string {
  return cancellation > 7
    ? 'bg-destructive/10 text-destructive border-destructive/20'
    : 'bg-success/10 text-success border-success/20';
}

function buildRows(): RouteRow[] {
  return [...routeAnalytics]
    .sort((a, b) => b.bookings - a.bookings)
    .map((r) => ({ ...r, cancellationClass: cancellationClass(r.cancellation) }));
}

@Component({
  selector: 'app-admin-route-analytics',
  imports: [NgIcon, HlmCardImports, HlmBadgeImports, PageHeader],
  templateUrl: './admin-route-analytics.html',
})
export class AdminRouteAnalytics {
  public readonly rows: RouteRow[] = buildRows();
  public readonly max = this.rows[0].bookings;
  public readonly top = this.rows.slice(0, 3);
  public readonly bottom = [...this.rows].slice(-3).reverse();

  public readonly totalRoutes = this.rows.length;
  public readonly totalBookings = this.rows.reduce((s, r) => s + r.bookings, 0);
  private readonly totalRevenue = this.rows.reduce((s, r) => s + r.revenue, 0);
  public readonly avgCancellation = (
    this.rows.reduce((s, r) => s + r.cancellation, 0) / this.rows.length
  ).toFixed(1);

  public readonly totalRevenueLabel = `₹${(this.totalRevenue / 100000).toFixed(1)}L`;

  public barWidth(bookings: number): number {
    return (bookings / this.max) * 100;
  }
}
