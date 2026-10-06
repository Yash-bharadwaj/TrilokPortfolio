import * as React from 'react'
import { calculateDailyMetrics, calculateMonthlyMetrics, generateInsights } from '@/calculations'
import { useSales } from '@/providers/sales-provider'
import { monthKeyOfDay } from '@/lib/date'
import type { ReportData, ReportKind } from '@/types'

/**
 * Builds report data for any date. The month-to-date figures are always cut at
 * the report date, so a 3 October report can never contain 4 October's sales.
 */
export function useReportBuilder() {
  const { entries, settings, entryFor } = useSales()

  return React.useCallback(
    (kind: ReportKind, date: string): ReportData => {
      const monthKey = monthKeyOfDay(date)
      const monthly = calculateMonthlyMetrics(monthKey, entries, settings.monthlyTarget, date)
      const daily = calculateDailyMetrics(date, entryFor(date), settings.monthlyTarget)
      return {
        kind,
        daily,
        monthly,
        insights: generateInsights(daily, monthly),
        generatedAt: Date.now(),
      }
    },
    [entries, settings.monthlyTarget, entryFor],
  )
}

export function useReportSheet() {
  const build = useReportBuilder()
  const [data, setData] = React.useState<ReportData | null>(null)
  const [open, setOpen] = React.useState(false)

  const show = React.useCallback(
    (kind: ReportKind, date: string) => {
      setData(build(kind, date))
      setOpen(true)
    },
    [build],
  )

  return { data, open, setOpen, show }
}
