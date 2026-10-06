import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/lib/format'
import { CHART_INK } from '@/lib/chart-palette'
import type { WeekdayPattern } from '@/calculations/patterns'

/**
 * Which days of the week actually carry the month — the one insight here that
 * leads to a decision, about staffing and prep rather than about reporting.
 */
export function WeekdayCard({ pattern }: { pattern: WeekdayPattern }) {
  if (!pattern.reliable || !pattern.best) return null

  const peak = Math.max(...pattern.stats.map((s) => s.average))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best days of the week</CardTitle>
        <CardDescription>
          {pattern.bestLift !== null && pattern.bestLift > 0
            ? `${pattern.best.label}s average ${formatCurrency(pattern.best.average)} — ${formatPercent(
                pattern.bestLift,
              )} above the usual day.`
            : `Averages across ${pattern.daysRecorded} recorded days.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {pattern.stats.map((stat) => {
            const width = peak > 0 ? (stat.average / peak) * 100 : 0
            const isBest = stat.weekday === pattern.best?.weekday
            return (
              <li key={stat.weekday} className="flex items-center gap-3">
                <span className="w-9 shrink-0 text-xs font-medium text-muted-foreground">
                  {stat.shortLabel}
                </span>
                <span className="h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-secondary">
                  <span
                    className="block h-full rounded-md transition-[width] duration-500"
                    style={{
                      width: `${Math.max(stat.days > 0 ? 2 : 0, width)}%`,
                      backgroundColor: isBest ? CHART_INK.bar : CHART_INK.barMuted,
                    }}
                  />
                </span>
                <span className="tnum w-20 shrink-0 text-right text-xs font-semibold">
                  {stat.days > 0 ? formatCurrency(stat.average) : '—'}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Average per day, from {pattern.daysRecorded} days recorded this month.
        </p>
      </CardContent>
    </Card>
  )
}
