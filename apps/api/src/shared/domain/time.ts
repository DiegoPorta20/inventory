/** Business operates in Peru (America/Lima, UTC-5, no DST). Date-only filters are interpreted in that zone. */
const BUSINESS_UTC_OFFSET = '-05:00';

export function startOfBusinessDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000${BUSINESS_UTC_OFFSET}`);
}

export function startOfNextBusinessDay(isoDate: string): Date {
  const next = startOfBusinessDay(isoDate);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function todayInBusinessZone(now: Date = new Date()): string {
  return new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
