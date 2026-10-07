import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  PlusIcon,
  Share2Icon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { MonthSelector } from '@/components/dashboard/month-selector'
import { useSales } from '@/providers/sales-provider'
import { useReportSheet } from '@/hooks/useReport'
import { useMonthlyMetrics } from '@/hooks/useMetrics'
import { totalSalesOf } from '@/calculations/config'
import { formatCompactPercent, formatCurrency } from '@/lib/format'
import { formatDayLabel, formatMonthLabel } from '@/lib/date'
import { cn } from '@/lib/utils'

const ReportSheet = React.lazy(() =>
  import('@/components/reports/report-sheet').then((m) => ({ default: m.ReportSheet })),
)

/**
 * Every recorded day, newest first. One tap edits it, one tap shares its report
 * — the "pick any past date and send it" requirement, without a separate screen.
 */
export function HistoryPage() {
  const { monthKey, entries, loading } = useSales()
  const monthly = useMonthlyMetrics()
  const report = useReportSheet()

  const rows = React.useMemo(() => [...entries].reverse(), [entries])
  const target = monthly.baseDailyTarget
  const hasTarget = monthly.monthlyTarget > 0

  return (
    <div className="space-y-4 pt-1">
      <MonthSelector />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDaysIcon}
          title={`No sales recorded in ${formatMonthLabel(monthKey)}`}
          description="Days you add will be listed here."
          action={
            <Button asChild className="mt-1">
              <Link to="/add">
                <PlusIcon className="size-4" />
                Add sales
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="divide-y divide-border overflow-hidden p-0">
            {rows.map((entry) => {
              const total = totalSalesOf(entry)
              const variance = total - target
              const ahead = variance >= 0
              // The arrow carries the direction, so the percentage is shown unsigned.
              const sharePct = target > 0 ? Math.abs((variance / target) * 100) : null
              return (
                <div key={entry.date} className="flex items-stretch">
                  <Link
                    to={`/add?date=${entry.date}`}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-3 pr-1 pl-4 transition-colors hover:bg-secondary/60"
                  >
                    {/* Date and its takings sit on one line; the comparison goes
                        beneath, kept to a single short line so a big rupee
                        figure can never push the row to three lines. */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {formatDayLabel(entry.date)}
                        </p>
                        <p className="tnum shrink-0 text-base font-bold">{formatCurrency(total)}</p>
                      </div>
                      {hasTarget && (
                        <p
                          className={cn(
                            'tnum mt-0.5 flex items-center gap-1 overflow-hidden text-[0.72rem] font-medium whitespace-nowrap',
                            ahead ? 'text-leaf-600' : 'text-brand-600',
                          )}
                        >
                          {ahead ? (
                            <ArrowUpRightIcon className="size-3 shrink-0" aria-hidden />
                          ) : (
                            <ArrowDownRightIcon className="size-3 shrink-0" aria-hidden />
                          )}
                          <span className="truncate">
                            {formatCurrency(Math.abs(variance))}
                            <span className="ml-1 text-muted-foreground">
                              ({formatCompactPercent(sharePct)})
                            </span>
                          </span>
                          <span className="sr-only">
                            {ahead ? 'above' : 'below'} the daily target
                          </span>
                        </p>
                      )}
                      {entry.note && (
                        <p className="truncate text-xs text-muted-foreground">{entry.note}</p>
                      )}
                    </div>
                    <ChevronRightIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => report.show('daily', entry.date)}
                    aria-label={`Share the report for ${formatDayLabel(entry.date)}`}
                    className="flex w-12 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-primary"
                  >
                    <Share2Icon className="size-4" aria-hidden />
                  </button>
                </div>
              )
            })}
          </Card>

          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => report.show('mtd', monthly.asOf)}
          >
            <Share2Icon className="size-4" />
            Share {formatMonthLabel(monthKey)} summary
          </Button>
        </>
      )}

      <React.Suspense fallback={null}>
        <ReportSheet data={report.data} open={report.open} onOpenChange={report.setOpen} />
      </React.Suspense>
    </div>
  )
}
