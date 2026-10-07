import { format } from 'date-fns'

/**
 * Every date in this app is a plain local calendar day keyed `YYYY-MM-DD`.
 * We never put a `Date` through UTC conversion, because a timezone shift of a
 * few hours would silently move a day's sales into the previous month.
 */
export type DayKey = string
export type MonthKey = string

export function toDayKey(date: Date): DayKey {
  return format(date, 'yyyy-MM-dd')
}

export function toMonthKey(date: Date): MonthKey {
  return format(date, 'yyyy-MM')
}

/** Parse `YYYY-MM-DD` into a local-midnight Date. */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Parse `YYYY-MM` into the local-midnight first of that month. */
export function fromMonthKey(key: MonthKey): Date {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, 1)
}

export function monthKeyOfDay(key: DayKey): MonthKey {
  return key.slice(0, 7)
}

export function todayKey(): DayKey {
  return toDayKey(new Date())
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(new Date())
}

/** Calendar length of the month, leap years included. */
export function daysInMonthOf(monthKey: MonthKey): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m ?? 1, 0).getDate()
}

export function dayOfMonth(key: DayKey): number {
  return Number(key.slice(8, 10))
}

export function firstDayKey(monthKey: MonthKey): DayKey {
  return `${monthKey}-01`
}

export function lastDayKey(monthKey: MonthKey): DayKey {
  return `${monthKey}-${String(daysInMonthOf(monthKey)).padStart(2, '0')}`
}

export function shiftMonth(monthKey: MonthKey, delta: number): MonthKey {
  const d = fromMonthKey(monthKey)
  d.setMonth(d.getMonth() + delta)
  return toMonthKey(d)
}

/** `5 October 2026` */
export function formatLongDate(key: DayKey): string {
  return format(fromDayKey(key), 'd MMMM yyyy')
}

/** `05 Oct 2026` */
export function formatShortDate(key: DayKey): string {
  return format(fromDayKey(key), 'dd MMM yyyy')
}

/** `Mon, 05 Oct` */
export function formatDayLabel(key: DayKey): string {
  return format(fromDayKey(key), 'EEE, dd MMM')
}

/** `October 2026` */
export function formatMonthLabel(monthKey: MonthKey): string {
  return format(fromMonthKey(monthKey), 'MMMM yyyy')
}

export function isFutureDay(key: DayKey): boolean {
  return key > todayKey()
}

/** Every day key in the month, in order. */
export function daysOfMonth(monthKey: MonthKey): DayKey[] {
  const n = daysInMonthOf(monthKey)
  return Array.from({ length: n }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`)
}

/** Every month key touched by an inclusive day range, in order. */
export function monthsBetween(from: DayKey, to: DayKey): MonthKey[] {
  const start = fromMonthKey(monthKeyOfDay(from))
  const endKey = monthKeyOfDay(to)
  const months: MonthKey[] = []
  for (let d = start; toMonthKey(d) <= endKey; d.setMonth(d.getMonth() + 1)) {
    months.push(toMonthKey(d))
    if (months.length > 240) break // a twenty-year range is a mistake, not a report
  }
  return months
}

/** `1 Oct 2026 – 15 Nov 2026` */
export function formatRangeLabel(from: DayKey, to: DayKey): string {
  return `${formatShortDate(from)} – ${formatShortDate(to)}`
}
