export interface KpiCard {
  title: string;
  value: number;
  unit: string;
  changePercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  icon: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category: string;
  color: string | null;
}

export interface UpcomingMaintenanceItem {
  maintenanceId: number;
  busId: number;
  busNumber: string;
  maintenanceType: string;
  scheduledDate: string;
}

export interface TopRoute {
  routeId: number;
  source: string;
  destination: string;
  bookingCount: number;
  revenue: number;
}

export interface ProviderDashboardResponse {
  providerId: number;
  todayBookings: KpiCard;
  todayRevenue: KpiCard;
  weeklyRevenue: KpiCard;
  monthlyRevenue: KpiCard;
  totalRevenue: KpiCard;
  activeTrips: KpiCard;
  runningTrips: KpiCard;
  completedTrips: KpiCard;
  cancelledTrips: KpiCard;
  delayedTrips: KpiCard;
  totalPassengers: KpiCard;
  fleetAvailability: KpiCard;
  revenueTrend: ChartDataPoint[];
  bookingTrend: ChartDataPoint[];
  tripStatusDistribution: ChartDataPoint[];
  fleetSummary: { totalBuses: number; activeBuses: number; maintenanceBuses: number };
  staffSummary: { activeDrivers: number; activeConductors: number };
  maintenanceSummary: { upcomingCount: number; nextItems: UpcomingMaintenanceItem[] };
  topRoutes: TopRoute[];
}
