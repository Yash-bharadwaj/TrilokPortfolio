import * as React from 'react'
import { calculateDailyMetrics, calculateMonthlyMetrics, generateInsights } from '@/calculations'
import { useSales } from '@/providers/sales-provider'
import type { DailyMetrics, Insight, MonthlyMetrics } from '@/types'
import { lastDayKey, todayKey } from '@/lib/date'

/**
 * Metrics for the selected month, evaluated as of `asOf`.
 * Passing a past date is what makes historical reports correct — the cut is
 * applied inside the calculation layer, never by filtering in a component.
 */
export function useMonthlyMetrics(asOf?: string): MonthlyMetrics {
  const { monthKey, entries, settings } = useSales()
  return React.useMemo(
    () => calculateMonthlyMetrics(monthKey, entries, settings.monthlyTarget, asOf),
    [monthKey, entries, settings.monthlyTarget, asOf],
  )
}

export function useDailyMetrics(date: string): DailyMetrics {
  const { entryFor, settings } = useSales()
  const entry = entryFor(date)
  return React.useMemo(
    () => calculateDailyMetrics(date, entry, settings.monthlyTarget),
    [date, entry, settings.monthlyTarget],
  )
}

export function useInsights(daily: DailyMetrics, monthly: MonthlyMetrics): Insight[] {
  return React.useMemo(() => generateInsights(daily, monthly), [daily, monthly])
}

/**
 * The day a report should cover: today when it has been entered, otherwise the
 * most recent recorded day, so "Share day" is never a dead button.
 */
export function useShareDate(): string | null {
  const { entries } = useSales()
  const focus = useFocusDate()
  return React.useMemo(() => {
    if (entries.some((e) => e.date === focus)) return focus
    const past = entries.filter((e) => e.date <= focus)
    return past.length > 0 ? past[past.length - 1]!.date : null
  }, [entries, focus])
}

/** The day the dashboard focuses on: today, or the last day of a past month. */
export function useFocusDate(): string {
  const { monthKey } = useSales()
  return React.useMemo(() => {
    const today = todayKey()
    if (today.startsWith(monthKey)) return today
    return today > monthKey ? lastDayKey(monthKey) : `${monthKey}-01`
  }, [monthKey])
}
