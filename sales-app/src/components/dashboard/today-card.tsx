import { Link } from 'react-router-dom'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Stat } from './stat'
import { formatCurrency, formatSignedCurrency } from '@/lib/format'
import { formatLongDate, todayKey } from '@/lib/date'
import { DIRECT_LABEL } from '@/calculations/config'
import type { DailyMetrics } from '@/types'

/** The day in focus: what came in, and whether it beat its share of the target. */
export function TodayCard({ daily, hasTarget }: { daily: DailyMetrics; hasTarget: boolean }) {
  const isToday = daily.date === todayKey()
  const heading = isToday ? 'Today' : formatLongDate(daily.date)

  if (!daily.entry) {
    return (
      <Card className="p-5 text-center">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {heading}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">No sales entered yet.</p>
        <Button asChild size="lg" className="mt-3 w-full">
          <Link to={`/add?date=${daily.date}`}>
            <PlusIcon className="size-5" />
            Enter {isToday ? "today's" : "that day's"} sales
          </Link>
        </Button>
      </Card>
    )
  }

  const ahead = daily.variance >= 0

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {heading}
          </p>
          <p className="tnum mt-1 text-3xl leading-none font-extrabold tracking-tight">
            {formatCurrency(daily.totalSales)}
          </p>
          {hasTarget && (
            <p className="mt-1.5 text-sm">
              <span
                className={ahead ? 'tnum font-bold text-leaf-600' : 'tnum font-bold text-brand-600'}
              >
                {formatSignedCurrency(daily.variance)}
              </span>{' '}
              <span className="text-muted-foreground">
                vs {formatCurrency(daily.baseDailyTarget)} target
              </span>
            </p>
          )}
        </div>
        <Button asChild variant="outline" size="icon" aria-label="Edit this day">
          <Link to={`/add?date=${daily.date}`}>
            <PencilIcon className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <Stat label="Swiggy" value={formatCurrency(daily.channels.swiggy)} />
        <Stat label="Zomato" value={formatCurrency(daily.channels.zomato)} />
        <Stat label={DIRECT_LABEL} value={formatCurrency(daily.channels.direct)} />
        {daily.food.recorded && (
          <>
            <Stat label="Veg" value={formatCurrency(daily.food.veg)} />
            <Stat label="Non-Veg" value={formatCurrency(daily.food.nonVeg)} />
          </>
        )}
        {daily.expenses > 0 && (
          <Stat label="Expenses" value={formatCurrency(daily.expenses)} tone="muted" />
        )}
      </div>
    </Card>
  )
}
