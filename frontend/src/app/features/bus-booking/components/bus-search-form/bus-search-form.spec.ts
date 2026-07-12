import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { BusSearchForm } from '@app/features/bus-booking/components/bus-search-form/bus-search-form';

describe('BusSearchForm', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [BusSearchForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(BusSearchForm);
    fixture.componentRef.setInput('initialSource', 'Bangalore');
    fixture.componentRef.setInput('initialDestination', 'Goa');
    fixture.componentRef.setInput('initialDate', new Date(2026, 6, 12));
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/api/routes`);
    req.flush({
      success: true,
      message: 'ok',
      error: null,
      data: [
        { id: 1, source: 'Bangalore', destination: 'Goa', distanceKm: 560, durationHours: 10, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00' },
        { id: 2, source: 'Bangalore', destination: 'Chennai', distanceKm: 350, durationHours: 6, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00' },
        { id: 3, source: 'Mumbai', destination: 'Goa', distanceKm: 600, durationHours: 12, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00' },
      ],
    });
    fixture.detectChanges();

    return { fixture, http };
  }

  it('emits search with the current source/destination/date on Search click', async () => {
    const { fixture, http } = await setup();

    let emitted: { source: string; destination: string; date: string } | undefined;
    fixture.componentInstance.search.subscribe((e) => (emitted = e));

    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Search',
    )!;
    button.click();

    expect(emitted).toEqual({ source: 'Bangalore', destination: 'Goa', date: '2026-07-12' });
    http.verify();
  });

  it('only offers destinations that are reachable from the selected source', async () => {
    const { fixture, http } = await setup();

    expect(fixture.componentInstance.destinations()).toEqual(['Goa']);

    fixture.componentInstance.onSourceChange('Mumbai');
    fixture.detectChanges();

    expect(fixture.componentInstance.destinations()).toEqual(['Goa']);
    http.verify();
  });

  it('clears the destination when it is no longer reachable from a newly selected source', async () => {
    const { fixture, http } = await setup();

    fixture.componentInstance.onSourceChange('Bangalore');
    fixture.componentInstance.onDestinationChange('Chennai');
    fixture.detectChanges();
    expect(fixture.componentInstance.destination()).toBe('Chennai');

    fixture.componentInstance.onSourceChange('Mumbai');
    fixture.detectChanges();

    expect(fixture.componentInstance.destination()).toBe('');
    http.verify();
  });
});
