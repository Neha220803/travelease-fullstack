/**
 * Converts a Date to a `YYYY-MM-DD` string using local calendar fields (not
 * `toISOString()`, which is UTC-based and can shift a locally-picked day
 * backward by one in negative UTC-offset timezones).
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a `YYYY-MM-DD` string as local midnight (not UTC midnight, which
 * `new Date('YYYY-MM-DD')` alone produces and which can render as the
 * previous day in negative UTC-offset timezones).
 */
export function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
