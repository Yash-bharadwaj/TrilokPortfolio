import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { MonthlyMetrics } from '@/types'

/**
 * The one card that answers "how are we doing this month?" without scrolling.
 */
export function MonthSummaryCard({ monthly }: { monthly: MonthlyMetrics }) {
  const hasTarget = monthly.monthlyTarget > 0
  const pct = monthly.achievement ?? 0

  return (
    <Card className="overflow-hidden border-brand-200/70 bg-gradient-to-b from-brand-50/80 to-card">
      <div className="p-5">
        <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
          {monthly.monthLabel} Sales
        </p>
        <p className="tnum mt-1 text-[2.6rem] leading-none font-extrabold tracking-tight text-foreground">
          {formatCurrency(monthly.mtdSales)}
        </p>

        {hasTarget ? (
          <>
            <p className="mt-1.5 text-sm text-muted-foreground">
              of <span className="tnum font-semibold text-foreground">{formatCurrency(monthly.monthlyTarget)}</span>{' '}
              target
            </p>

            <div className="mt-4 space-y-2">
              <Progress
                value={Math.min(100, pct)}
                aria-label={`${formatPercent(pct)} of the monthly target achieved`}
                indicatorClassName={pct >= 100 ? 'bg-leaf-500' : 'bg-primary'}
              />
              <div className="flex items-baseline justify-between gap-3">
                <p className="tnum text-sm font-bold">
                  {formatPercent(pct)} <span className="font-medium text-muted-foreground">done</span>
                </p>
                <p className="tnum text-sm text-muted-foreground">
                  {monthly.remaining > 0 ? (
                    <>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(monthly.remaining)}
                      </span>{' '}
                      to go
                    </>
                  ) : (
                    <span className="font-semibold text-leaf-600">Target reached 🎉</span>
                  )}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-lg bg-secondary/70 p-3">
            <p className="text-sm text-muted-foreground">
              No target set for {monthly.monthLabel}.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/settings">Set monthly target</Link>
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
