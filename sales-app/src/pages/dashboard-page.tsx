import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PlusIcon, Share2Icon, CalendarRangeIcon, ArrowRightIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { MonthSelector } from '@/components/dashboard/month-selector'
import { MonthSummaryCard } from '@/components/dashboard/month-summary-card'
import { TodayCard } from '@/components/dashboard/today-card'
import { PerformanceCard } from '@/components/dashboard/performance-card'
import { KeyNumbers } from '@/components/dashboard/key-numbers'
import { ChannelCard, FoodCard } from '@/components/dashboard/breakdown-cards'
import { InsightsCard } from '@/components/dashboard/insights-card'
import { DailyTable } from '@/components/dashboard/daily-table'
import { MissingDaysCard } from '@/components/dashboard/missing-days-card'
import { OfflineNotice } from '@/components/dashboard/offline-notice'
import { WeekdayCard } from '@/components/dashboard/weekday-card'
import { TargetForm } from '@/components/dashboard/target-form'
import { BrundavanEmblem } from '@/components/brand'
import { useSales } from '@/providers/sales-provider'
import {
  useDailyMetrics,
  useFocusDate,
  useInsights,
  useMissingDays,
  useMonthComparison,
  useMonthlyMetrics,
  useShareDate,
  useWeekdayPattern,
} from '@/hooks/useMetrics'
import { useReportSheet } from '@/hooks/useReport'
import { currentMonthKey, formatMonthLabel } from '@/lib/date'
import { cn } from '@/lib/utils'

// Recharts and the image generator are the two heavy dependencies here, and
// neither is needed to paint the numbers the manager opens the app for.
const TrendChart = React.lazy(() =>
  import('@/components/dashboard/trend-chart').then((m) => ({ default: m.TrendChart })),
)
const ReportSheet = React.lazy(() =>
  import('@/components/reports/report-sheet').then((m) => ({ default: m.ReportSheet })),
)

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const { monthKey, entries, settings, loading, error, isOnline, hasServerData, pendingWrites } =
    useSales()
  const focusDate = useFocusDate()
  const monthly = useMonthlyMetrics()
  const daily = useDailyMetrics(focusDate)
  const insights = useInsights(daily, monthly)
  const reportDate = useShareDate()
  const missingDays = useMissingDays()
  const weekdayPattern = useWeekdayPattern()
  const comparison = useMonthComparison(monthly)
  const report = useReportSheet()

  // Saving sales lands here with ?share=<date>, which opens the report straight
  // away: enter → save → send, without hunting for a button.
  const shareDate = params.get('share')
  const { show } = report
  const sharedRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!shareDate || sharedRef.current === shareDate || loading) return

    if (entries.some((e) => e.date === shareDate)) {
      sharedRef.current = shareDate
      show('daily', shareDate)
      setParams({}, { replace: true })
      return
    }

    // The day may not have reached us yet. Wait for it rather than dropping the
    // hand-off, but do not leave the parameter sitting in the URL for ever.
    const timer = window.setTimeout(() => setParams({}, { replace: true }), 8000)
    return () => window.clearTimeout(timer)
  }, [shareDate, loading, entries, show, setParams])

  const hasTarget = settings.monthlyTarget > 0
  const firstRun = !hasTarget && entries.length === 0

  /*
   * The month selector is rendered once, outside all of this, so it is never
   * taken away. Landing on a month with no target used to replace the whole
   * screen with the setup card, leaving no way back to a month that had data.
   */
  const body = (() => {
    if (loading) {
      return (
        <>
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </>
      )
    }

    if (error) {
      return (
        <Card className="p-5 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button className="mt-3" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </Card>
      )
    }

    // Offline with nothing from the server: say so rather than totalling up only
    // the entries that happen to be queued on this device.
    if (!isOnline && !hasServerData) {
      return <OfflineNotice pendingWrites={pendingWrites} />
    }

    if (firstRun) {
      const isThisMonth = monthKey === currentMonthKey()
      return (
        <Card className="mx-auto max-w-sm p-6 text-center">
          {isThisMonth && <BrundavanEmblem className="mx-auto h-14 w-auto" />}
          <h1 className={cn('text-lg font-bold', isThisMonth && 'mt-3')}>
            {isThisMonth ? 'Welcome' : `Nothing recorded in ${formatMonthLabel(monthKey)}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isThisMonth
              ? `Start by setting the sales target for ${formatMonthLabel(monthKey)}.`
              : 'Set a target for this month, or use the arrows above to go back.'}
          </p>
          <div className="mt-5 text-left">
            <TargetForm
              monthKey={monthKey}
              submitLabel={isThisMonth ? 'Continue' : 'Save target'}
            />
          </div>
        </Card>
      )
    }

    return (
      <>
        <MonthSummaryCard monthly={monthly} comparison={comparison} />

        <TodayCard daily={daily} hasTarget={hasTarget} />

        {/* The two actions this app exists for, side by side and always reachable. */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            onClick={() => reportDate && report.show('daily', reportDate)}
            disabled={!reportDate}
          >
            <Share2Icon className="size-4" />
            Share day
          </Button>
          <Button onClick={() => report.show('mtd', monthly.asOf)} disabled={entries.length === 0}>
            <CalendarRangeIcon className="size-4" />
            Share month
          </Button>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={PlusIcon}
            title={`No sales recorded in ${formatMonthLabel(monthKey)}`}
            description="Add a day to see totals, charts and reports."
            action={
              <Button asChild className="mt-1">
                <Link to="/add">Add sales</Link>
              </Button>
            }
          />
        ) : (
          <>
            <MissingDaysCard missing={missingDays} />
            <PerformanceCard status={monthly.status} />
            <KeyNumbers monthly={monthly} />
            <DailyTable monthly={monthly} />
            <React.Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
              <TrendChart monthly={monthly} />
            </React.Suspense>
            <WeekdayCard pattern={weekdayPattern} />
            <ChannelCard channels={monthly.channels} title="Where sales came from this month" />
            <FoodCard food={monthly.food} />
            <InsightsCard insights={insights} />

            <Card>
              <CardHeader>
                <CardTitle>Recent days</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/history">
                    View all {entries.length} {entries.length === 1 ? 'day' : 'days'}
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </>
    )
  })()

  return (
    <div className="space-y-4 pt-1">
      <MonthSelector />
      {body}
      <React.Suspense fallback={null}>
        <ReportSheet data={report.data} open={report.open} onOpenChange={report.setOpen} />
      </React.Suspense>
    </div>
  )
}
