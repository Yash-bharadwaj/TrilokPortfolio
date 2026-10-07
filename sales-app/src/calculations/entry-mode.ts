import type { DailySales } from '@/types'
import { ENTRY_MODE } from './config'
import { monthKeyOfDay } from '@/lib/date'

/** The numeric fields that are written as running totals. */
const AMOUNTS = [
  'netSales',
  'swiggySales',
  'zomatoSales',
  'vegSales',
  'nonVegSales',
  'expenses',
] as const

/**
 * Turns stored records into one-day figures.
 *
 * When the hotel keeps a running month-to-date sheet, each stored line already
 * contains every earlier day, so a day's own takings are that line minus the
 * line before it. Totals reset at the start of each month, so months are
 * differenced independently.
 *
 * A line lower than the one before cannot happen in a genuine running total; it
 * means a figure was mistyped. Rather than produce a negative day, which would
 * silently subtract from the month, the day is floored at zero and the entry
 * form warns separately.
 */
export function toDailyEntries(entries: DailySales[]): DailySales[] {
  if (ENTRY_MODE === 'daily') return entries

  const byMonth = new Map<string, DailySales[]>()
  for (const entry of entries) {
    const key = monthKeyOfDay(entry.date)
    const bucket = byMonth.get(key)
    if (bucket) bucket.push(entry)
    else byMonth.set(key, [entry])
  }

  const out: DailySales[] = []
  for (const bucket of byMonth.values()) {
    const sorted = [...bucket].sort((a, b) => a.date.localeCompare(b.date))
    let previous: DailySales | null = null
    for (const entry of sorted) {
      const daily: DailySales = { ...entry }
      for (const field of AMOUNTS) {
        daily[field] = Math.max(0, entry[field] - (previous ? previous[field] : 0))
      }
      out.push(daily)
      previous = entry
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The running total standing immediately before a date — what a new entry for
 * that date must build on. Used to show the form what it is adding to.
 */
export function cumulativeBefore(
  entries: DailySales[],
  date: string,
): Record<(typeof AMOUNTS)[number], number> {
  const month = monthKeyOfDay(date)
  const earlier = entries
    .filter((e) => monthKeyOfDay(e.date) === month && e.date < date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const last = earlier[earlier.length - 1]

  const zero = Object.fromEntries(AMOUNTS.map((f) => [f, 0])) as Record<
    (typeof AMOUNTS)[number],
    number
  >
  if (ENTRY_MODE === 'daily') {
    // Nothing to build on: each entry stands alone.
    return zero
  }
  if (!last) return zero
  return Object.fromEntries(AMOUNTS.map((f) => [f, last[f]])) as Record<
    (typeof AMOUNTS)[number],
    number
  >
}
