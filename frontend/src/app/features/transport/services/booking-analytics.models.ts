import { ChartDataPoint } from '@app/features/transport/services/dashboard.models';

export interface BookingAnalyticsResponse {
  providerId: number;
  rangeStart: string;
  rangeEnd: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  peakBookingHours: ChartDataPoint[];
  peakTravelDays: ChartDataPoint[];
  bookingGrowth: ChartDataPoint[];
  bookingStatusDistribution: ChartDataPoint[];
}

export interface RevenueAnalyticsResponse {
  providerId: number;
  rangeStart: string;
  rangeEnd: string;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  rangeRevenue: number;
  revenueGrowthPercent: number;
  averageBookingValue: number;
  averageFare: number;
  couponUsageCount: number;
  totalCouponDiscount: number;
  totalDiscountAmount: number;
  dailyRevenueTrend: ChartDataPoint[];
  weeklyRevenueTrend: ChartDataPoint[];
  monthlyRevenueTrend: ChartDataPoint[];
}
