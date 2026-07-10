import { TestBed } from '@angular/core/testing';
import { BusSearchForm } from '@app/features/bus-booking/components/bus-search-form/bus-search-form';

describe('BusSearchForm', () => {
  it('emits search with the current source/destination/date on Search click', async () => {
    await TestBed.configureTestingModule({ imports: [BusSearchForm] }).compileComponents();
    const fixture = TestBed.createComponent(BusSearchForm);
    fixture.componentRef.setInput('initialSource', 'Bengaluru');
    fixture.componentRef.setInput('initialDestination', 'Goa');
    fixture.componentRef.setInput('initialDate', new Date(2026, 6, 12));
    fixture.detectChanges();

    let emitted: { source: string; destination: string; date: string } | undefined;
    fixture.componentInstance.search.subscribe((e) => (emitted = e));

    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Search',
    )!;
    button.click();

    expect(emitted).toEqual({ source: 'Bengaluru', destination: 'Goa', date: '2026-07-12' });
  });
});
