import { fromIsoDate, toIsoDate } from '@app/core/dates/date-utils';

describe('date-utils', () => {
  it('round-trips an ISO date string through fromIsoDate/toIsoDate', () => {
    expect(toIsoDate(fromIsoDate('2026-07-12'))).toBe('2026-07-12');
  });

  it('pads single-digit month and day', () => {
    expect(toIsoDate(fromIsoDate('2026-01-05'))).toBe('2026-01-05');
  });

  it('parses as local midnight, not UTC midnight', () => {
    const date = fromIsoDate('2026-07-12');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(12);
    expect(date.getHours()).toBe(0);
  });
});
