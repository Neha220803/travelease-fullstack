import { TestBed } from '@angular/core/testing';
import { FareSummary } from '@app/features/bus-booking/components/fare-summary/fare-summary';
import { FareBreakdownResponse } from '@app/features/bus-booking/services/schedule.models';

const BREAKDOWN = {
  subtotal: 1000,
  discountAmount: 0,
  couponDiscount: 100,
  appliedCoupon: 'SAVE100',
  gstAmount: 50,
  taxAmount: 10,
  finalAmount: 960,
} as FareBreakdownResponse;

describe('FareSummary', () => {
  it('renders the applied coupon and final amount', async () => {
    await TestBed.configureTestingModule({ imports: [FareSummary] }).compileComponents();
    const fixture = TestBed.createComponent(FareSummary);
    fixture.componentRef.setInput('breakdown', BREAKDOWN);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SAVE100');
    expect(text).toContain('960');
  });
});
