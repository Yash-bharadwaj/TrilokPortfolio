import { Card } from '@/components/ui/card'
import { Stat } from './stat'
import { formatCurrency } from '@/lib/format'
import type { MonthlyMetrics } from '@/types'

/**
 * The four numbers a manager actually acts on. Deliberately not the full set the
 * engine can produce — the rest would be noise on a phone.
 */
export function KeyNumbers({ monthly }: { monthly: MonthlyMetrics }) {
  const projection = monthly.projection

  return (
    <Card className="grid grid-cols-2 gap-4 p-4">
      <Stat
        label="Average per day"
        value={formatCurrency(monthly.averageDailySales)}
        hint={`over ${monthly.daysRecorded} ${monthly.daysRecorded === 1 ? 'day' : 'days'} recorded`}
      />
      <Stat
        label="Needed per day"
        value={monthly.requiredDailyPace === null ? '—' : formatCurrency(monthly.requiredDailyPace)}
        hint={
          monthly.daysRemaining > 0
            ? `for the last ${monthly.daysRemaining} ${monthly.daysRemaining === 1 ? 'day' : 'days'}`
            : 'month finished'
        }
      />
      <Stat
        label="Daily target"
        value={formatCurrency(monthly.baseDailyTarget)}
        hint={`${formatCurrency(monthly.monthlyTarget)} ÷ ${monthly.daysInMonth} days`}
      />
      <Stat
        label={monthly.daysRemaining === 0 ? 'Month finished at' : 'Month may end at'}
        value={
          monthly.daysRemaining === 0
            ? formatCurrency(monthly.mtdSales)
            : projection.projected === null
              ? '—'
              : formatCurrency(projection.projected)
        }
        hint={
          projection.projected === null
            ? 'needs at least one day'
            : projection.lowConfidence
              ? 'early estimate'
              : projection.varianceToTarget === null
                ? undefined
                : projection.varianceToTarget >= 0
                  ? `${formatCurrency(projection.varianceToTarget)} above target`
                  : `${formatCurrency(-projection.varianceToTarget)} below target`
        }
        tone={
          projection.varianceToTarget === null
            ? 'default'
            : projection.varianceToTarget >= 0
              ? 'positive'
              : 'negative'
        }
      />
    </Card>
  )
}
