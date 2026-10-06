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
import { TargetForm } from '@/components/dashboard/target-form'
import { BrundavanEmblem } from '@/components/brand'
import { useSales } from '@/providers/sales-provider'
import {
  useDailyMetrics,
  useFocusDate,
  useInsights,
  useMonthlyMetrics,
  useShareDate,
} from '@/hooks/useMetrics'
import { useReportSheet } from '@/hooks/useReport'
import { formatMonthLabel } from '@/lib/date'

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
  const { monthKey, entries, settings, loading, error } = useSales()
  const focusDate = useFocusDate()
  const monthly = useMonthlyMetrics()
  const daily = useDailyMetrics(focusDate)
  const insights = useInsights(daily, monthly)
  const reportDate = useShareDate()
  const report = useReportSheet()

  // Saving sales lands here with ?share=<date>, which opens the report straight
  // away: enter → save → send, without hunting for a button.
  const shareDate = params.get('share')
  const { show } = report
  React.useEffect(() => {
    if (!shareDate || loading) return
    if (entries.some((e) => e.date === shareDate)) show('daily', shareDate)
    setParams({}, { replace: true })
  }, [shareDate, loading, entries, show, setParams])

  const hasTarget = settings.monthlyTarget > 0
  const firstRun = !hasTarget && entries.length === 0

  if (loading) {
    return (
      <div className="space-y-4 pt-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mt-4 p-5 text-center">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button className="mt-3" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </Card>
    )
  }

  if (firstRun) {
    return (
      <div className="mx-auto mt-6 max-w-sm">
        <Card className="p-6 text-center">
          <BrundavanEmblem className="mx-auto h-14 w-auto" />
          <h1 className="mt-3 text-lg font-bold">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by setting the sales target for {formatMonthLabel(monthKey)}.
          </p>
          <div className="mt-5 text-left">
            <TargetForm monthKey={monthKey} submitLabel="Continue" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-1">
      <MonthSelector />

      <MonthSummaryCard monthly={monthly} />

      <TodayCard daily={daily} hasTarget={hasTarget} />

      {/* The two actions this app exists for, side by side and always reachable. */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          size="lg"
          variant="outline"
          onClick={() => reportDate && report.show('daily', reportDate)}
          disabled={!reportDate}
        >
          <Share2Icon className="size-4" />
          Share day
        </Button>
        <Button
          size="lg"
          onClick={() => report.show('mtd', monthly.asOf)}
          disabled={entries.length === 0}
        >
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
          <PerformanceCard status={monthly.status} />
          <KeyNumbers monthly={monthly} />
          <React.Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
            <TrendChart monthly={monthly} />
          </React.Suspense>
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

      <React.Suspense fallback={null}>
        <ReportSheet data={report.data} open={report.open} onOpenChange={report.setOpen} />
      </React.Suspense>
    </div>
  )
}
