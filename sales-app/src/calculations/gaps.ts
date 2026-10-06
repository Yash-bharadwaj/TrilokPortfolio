import type { DailySales } from '@/types'
import { daysOfMonth, todayKey } from '@/lib/date'

/**
 * Days of the month that have already passed but hold no record.
 *
 * This matters beyond tidiness: the month's average divides by days recorded,
 * so an unnoticed gap quietly inflates the average and the projection with it.
 */
export function findMissingDays(monthKey: string, entries: DailySales[], asOf?: string): string[] {
  const recorded = new Set(entries.map((e) => e.date))
  const cutoff = asOf ?? todayKey()
  return daysOfMonth(monthKey).filter((day) => day <= cutoff && !recorded.has(day))
}
