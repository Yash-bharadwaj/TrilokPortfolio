import type { DailySales } from '@/types'
import { fromDayKey } from '@/lib/date'
import { totalSalesOf } from './config'

export interface WeekdayStat {
  /** 0 = Sunday. */
  weekday: number
  label: string
  shortLabel: string
  total: number
  days: number
  average: number
}

export interface WeekdayPattern {
  stats: WeekdayStat[]
  best: WeekdayStat | null
  worst: WeekdayStat | null
  /** How far the best day sits above the all-day average, as a percentage. */
  bestLift: number | null
  overallAverage: number | null
  daysRecorded: number
  /** Too few days for the pattern to mean anything yet. */
  reliable: boolean
}

const LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Below this, one unusual day would dominate the averages. */
export const MIN_DAYS_FOR_PATTERN = 8

/**
 * Average takings per weekday. Each weekday is averaged over the days actually
 * recorded for it, so a month with three Saturdays and four Sundays is not
 * skewed by the uneven count.
 */
export function calculateWeekdayPattern(entries: DailySales[]): WeekdayPattern {
  const buckets = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    label: LABELS[weekday]!,
    shortLabel: SHORT[weekday]!,
    total: 0,
    days: 0,
    average: 0,
  }))

  for (const entry of entries) {
    const bucket = buckets[fromDayKey(entry.date).getDay()]!
    bucket.total += totalSalesOf(entry)
    bucket.days += 1
  }
  for (const bucket of buckets) {
    bucket.average = bucket.days > 0 ? bucket.total / bucket.days : 0
  }

  const recorded = buckets.filter((b) => b.days > 0)
  const grandTotal = recorded.reduce((sum, b) => sum + b.total, 0)
  const daysRecorded = recorded.reduce((sum, b) => sum + b.days, 0)
  const overallAverage = daysRecorded > 0 ? grandTotal / daysRecorded : null

  const best = recorded.length > 0 ? recorded.reduce((a, b) => (b.average > a.average ? b : a)) : null
  const worst = recorded.length > 0 ? recorded.reduce((a, b) => (b.average < a.average ? b : a)) : null

  return {
    stats: buckets,
    best,
    worst,
    bestLift:
      best && overallAverage && overallAverage > 0
        ? ((best.average - overallAverage) / overallAverage) * 100
        : null,
    overallAverage,
    daysRecorded,
    reliable: daysRecorded >= MIN_DAYS_FOR_PATTERN && recorded.length >= 3,
  }
}
