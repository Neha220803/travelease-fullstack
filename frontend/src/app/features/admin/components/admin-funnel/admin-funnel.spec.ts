import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideTrendingDown } from '@ng-icons/lucide';
import { dropReasons, funnelStages } from '@app/core/mock-data';
import { AdminFunnel } from '@app/features/admin/components/admin-funnel/admin-funnel';

describe('AdminFunnel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFunnel],
      providers: [provideIcons({ lucideArrowDown, lucideTrendingDown })],
    }).compileComponents();
  });

  it('computes conversion and total drop-off correctly', () => {
    const fixture = TestBed.createComponent(AdminFunnel);
    const c = fixture.componentInstance;
    const total = funnelStages[0].users;
    const completed = funnelStages[funnelStages.length - 1].users;
    const conversion = ((completed / total) * 100).toFixed(1);
    expect(c.conversion).toBe(conversion);
    expect(c.totalDropOff).toBe((100 - parseFloat(conversion)).toFixed(1));
  });

  it('computes the drop-off percentage between each consecutive stage pair', () => {
    const fixture = TestBed.createComponent(AdminFunnel);
    const c = fixture.componentInstance;
    for (let i = 1; i < funnelStages.length; i++) {
      const prev = funnelStages[i - 1].users;
      const curr = funnelStages[i].users;
      const expected = (((prev - curr) / prev) * 100).toFixed(1);
      expect(c.stages[i].dropPct).toBe(expected);
    }
    expect(c.stages[0].dropPct).toBeNull();
  });

  it('renders all 5 drop reasons with the correct bar width', () => {
    const fixture = TestBed.createComponent(AdminFunnel);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const r of dropReasons) {
      expect(text).toContain(r.reason);
      expect(text).toContain(`${r.pct}%`);
    }
  });
});
