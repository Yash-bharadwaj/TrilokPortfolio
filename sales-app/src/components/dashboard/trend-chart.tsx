import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CHART_INK } from '@/lib/chart-palette'
import { formatCompactCurrency, formatCurrency, formatSignedCurrency } from '@/lib/format'
import { formatLongDate } from '@/lib/date'
import { totalSalesOf } from '@/calculations/config'
import type { MonthlyMetrics } from '@/types'

interface Point {
  day: number
  date: string
  total: number
}

/**
 * One chart instead of two: daily bars with the daily target drawn across them,
 * so "how did each day do" and "did it beat target" are the same glance.
 */
export function TrendChart({ monthly }: { monthly: MonthlyMetrics }) {
  const data: Point[] = monthly.entries.map((e) => ({
    day: Number(e.date.slice(8, 10)),
    date: e.date,
    total: totalSalesOf(e),
  }))

  if (data.length === 0) return null

  const target = monthly.baseDailyTarget
  const hasTarget = target > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales each day</CardTitle>
        {hasTarget && (
          <CardDescription>
            Dotted line is the daily target of {formatCurrency(target)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_INK.axis, fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_INK.axis, fontSize: 11 }}
                tickFormatter={(v: number) => formatCompactCurrency(v)}
                width={52}
              />
              <Tooltip
                cursor={{ fill: 'rgba(26,22,20,0.04)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const point = payload[0]?.payload as Point
                  return (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-raise">
                      <p className="text-xs font-semibold">{formatLongDate(point.date)}</p>
                      <p className="tnum text-sm font-bold">{formatCurrency(point.total)}</p>
                      {hasTarget && (
                        <p className="tnum text-xs text-muted-foreground">
                          {formatSignedCurrency(point.total - target)} vs target
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              {hasTarget && (
                <ReferenceLine
                  y={target}
                  stroke={CHART_INK.target}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              )}
              <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell
                    key={d.date}
                    fill={hasTarget && d.total < target ? CHART_INK.barMuted : CHART_INK.bar}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
