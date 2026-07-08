import { TestBed } from '@angular/core/testing';
import { HotelReports } from '@app/features/hotel/components/hotel-reports/hotel-reports';
import { HotelProviderService } from '@app/features/hotel/services/hotel-provider.service';
import {
  TEST_PROVIDER_OVERVIEW,
  createHotelProviderStub,
} from '@app/features/hotel/testing/hotel-provider-test-data';
import { buildReportStats } from '@app/features/hotel/services/hotel-provider-view-models';

describe('HotelReports', () => {
  it('renders real report stats computed from the provider overview', async () => {
    await TestBed.configureTestingModule({
      imports: [HotelReports],
      providers: [{ provide: HotelProviderService, useValue: createHotelProviderStub() }],
    }).compileComponents();

    const fixture = TestBed.createComponent(HotelReports);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const stat of buildReportStats(TEST_PROVIDER_OVERVIEW)) {
      expect(text).toContain(stat.value);
    }
  });
});
