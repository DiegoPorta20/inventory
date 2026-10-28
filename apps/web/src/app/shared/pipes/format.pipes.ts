import { Pipe, type PipeTransform } from '@angular/core';

const LOCALE = 'es-PE';
const TIME_ZONE = 'America/Lima';

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimal2 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const decimal4 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});
const dateOnly = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: TIME_ZONE });

export const formatQuantity = (value: number | null | undefined): string =>
  value == null ? '—' : integer.format(value);

export const formatUsd = (value: number | null | undefined, precise = false): string =>
  value == null ? '—' : `$ ${(precise ? decimal4 : decimal2).format(value)}`;

export const formatPen = (value: number | null | undefined): string =>
  value == null ? '—' : `S/ ${decimal2.format(value)}`;

export function formatDateTime(value: string | Date | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : '—';
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date =
    typeof value === 'string' && value.length === 10
      ? new Date(`${value}T12:00:00Z`)
      : new Date(value);
  return dateOnly.format(date);
}

@Pipe({ name: 'quantity' })
export class QuantityPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatQuantity(value);
  }
}

@Pipe({ name: 'signedQuantity' })
export class SignedQuantityPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value > 0 ? '+' : ''}${integer.format(value)}`;
  }
}

@Pipe({ name: 'usd' })
export class UsdPipe implements PipeTransform {
  transform(value: number | null | undefined, precise = false): string {
    return formatUsd(value, precise);
  }
}

@Pipe({ name: 'pen' })
export class PenPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatPen(value);
  }
}

@Pipe({ name: 'dateTime' })
export class DateTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatDateTime(value);
  }
}

@Pipe({ name: 'dateOnly' })
export class DateOnlyPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatDate(value);
  }
}

export const FORMAT_PIPES = [
  QuantityPipe,
  SignedQuantityPipe,
  UsdPipe,
  PenPipe,
  DateTimePipe,
  DateOnlyPipe,
] as const;
