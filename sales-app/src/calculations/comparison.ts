import type { DailySales, MonthlyMetrics } from '@/types'
import { dayOfMonth, formatMonthLabel } from '@/lib/date'
import { totalSalesOf } from './config'

export interface MonthComparison {
  previousMonthKey: string
  previousLabel: string
  previousTotal: number
  currentTotal: number
  change: number
  changePercent: number | null
  /** Days of each month included — the comparison is always like-for-like. */
  daysCompared: number
  /** True when the previous month was trimmed to match the days elapsed so far. */
  trimmed: boolean
}

/**
 * This month against the one before it.
 *
 * Six days of October against a whole September would be a meaningless drop, so
 * the previous month is cut to the same number of days that have elapsed in the
 * current one. Once the current month is complete, both are compared in full.
 */
export function compareToPreviousMonth(
  current: MonthlyMetrics,
  previousMonthKey: string,
  previousEntries: DailySales[],
): MonthComparison | null {
  const window = current.daysElapsed
  if (window <= 0) return null

  const trimmed = window < current.daysInMonth
  const included = previousEntries.filter((entry) => dayOfMonth(entry.date) <= window)
  if (included.length === 0) return null

  const previousTotal = included.reduce((sum, entry) => sum + totalSalesOf(entry), 0)
  const currentTotal = current.mtdSales
  const change = currentTotal - previousTotal

  return {
    previousMonthKey,
    previousLabel: formatMonthLabel(previousMonthKey),
    previousTotal,
    currentTotal,
    change,
    changePercent: previousTotal > 0 ? (change / previousTotal) * 100 : null,
    daysCompared: window,
    trimmed,
  }
}
