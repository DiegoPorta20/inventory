/**
 * Calendar-date helpers over ISO strings (`YYYY-MM-DD`), the format the API uses for date-only
 * fields. Arithmetic runs in UTC so daylight-saving or the browser time zone never shifts a day.
 */
export type IsoDate = string;

const LOCALE = 'es-PE';
const BUSINESS_TIME_ZONE = 'America/Lima';

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number): string => String(value).padStart(2, '0');

const toDate = (iso: IsoDate): Date => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
};

const fromDate = (date: Date): IsoDate =>
  `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** True when the string is a real calendar date (rejects 2026-02-31). */
export function isValidIso(value: string): boolean {
  const match = ISO_PATTERN.exec(value);
  if (!match) return false;
  return fromDate(toDate(value)) === value;
}

export function buildIso(year: number, month: number, day: number): IsoDate | null {
  if (year < 1900 || year > 2100) return null;
  const iso = `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
  return isValidIso(iso) ? iso : null;
}

/** Today in the business time zone (Lima), regardless of the browser's own zone. */
export function todayIso(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(now);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromDate(date);
}

/** Moves by whole months, keeping the day when possible (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: IsoDate, months: number): IsoDate {
  const date = toDate(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return fromDate(date);
}

export const startOfMonth = (iso: IsoDate): IsoDate => `${iso.slice(0, 8)}01`;

export const endOfMonth = (iso: IsoDate): IsoDate => addDays(addMonths(startOfMonth(iso), 1), -1);

export const startOfYear = (iso: IsoDate): IsoDate => `${iso.slice(0, 4)}-01-01`;

export const endOfYear = (iso: IsoDate): IsoDate => `${iso.slice(0, 4)}-12-31`;

/** Monday = 0 … Sunday = 6. */
export const weekdayIndex = (iso: IsoDate): number => (toDate(iso).getUTCDay() + 6) % 7;

export interface MonthCell {
  iso: IsoDate;
  day: number;
  /** Belongs to the previous or next month (shown to fill the 6x7 grid). */
  outside: boolean;
}

/** Six weeks starting on Monday, so the grid height never jumps between months. */
export function monthWeeks(anyDayOfMonth: IsoDate): MonthCell[][] {
  const first = startOfMonth(anyDayOfMonth);
  const month = first.slice(0, 7);
  const gridStart = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const iso = addDays(gridStart, week * 7 + day);
      return { iso, day: Number(iso.slice(8)), outside: !iso.startsWith(month) };
    }),
  );
}

const dayLong = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayShort = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthTitle = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "miércoles, 28 de octubre de 2026" — for screen readers. */
export const formatLong = (iso: IsoDate): string => dayLong.format(toDate(iso));

/** "28 oct 2026" */
export const formatShort = (iso: IsoDate): string =>
  dayShort.format(toDate(iso)).replace(/\./g, '');

/** "octubre de 2026" */
export const formatMonth = (iso: IsoDate): string => monthTitle.format(toDate(iso));

/** "28/10/2026", the text shown inside the date input. */
export const toDisplay = (iso: IsoDate): string =>
  isValidIso(iso) ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';

/** Accepts "28/10/2026", "28-10-2026" or "28.10.2026"; returns null when it is not a real date. */
export function fromDisplay(text: string): IsoDate | null {
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text.trim());
  if (!match) return null;
  return buildIso(Number(match[3]), Number(match[2]), Number(match[1]));
}

/** Progressive dd/mm/aaaa mask: keeps digits only and inserts the slashes. */
export function maskDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
}

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export interface RangePreset {
  label: string;
  range: (today: IsoDate) => DateRange;
}

export const RANGE_PRESETS: readonly RangePreset[] = [
  { label: 'Hoy', range: (today) => ({ from: today, to: today }) },
  {
    label: 'Ayer',
    range: (today) => ({ from: addDays(today, -1), to: addDays(today, -1) }),
  },
  { label: 'Últimos 7 días', range: (today) => ({ from: addDays(today, -6), to: today }) },
  { label: 'Últimos 30 días', range: (today) => ({ from: addDays(today, -29), to: today }) },
  {
    label: 'Este mes',
    range: (today) => ({ from: startOfMonth(today), to: endOfMonth(today) }),
  },
  {
    label: 'Mes pasado',
    range: (today) => {
      const previous = addMonths(startOfMonth(today), -1);
      return { from: previous, to: endOfMonth(previous) };
    },
  },
  { label: 'Este año', range: (today) => ({ from: startOfYear(today), to: endOfYear(today) }) },
];
