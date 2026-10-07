import { format } from 'date-fns'
import {
  Bar,
  INK,
  Masthead,
  MeterRow,
  REPORT_WIDTH,
  ReportFooter,
  SectionLabel,
  StatCell,
  Verdict,
} from './report-parts'
import { CHANNEL_COLORS, FOOD_COLORS } from '@/lib/chart-palette'
import { DIRECT_LABEL, directSalesOf, totalSalesOf } from '@/calculations/config'
import { topInsights } from '@/calculations/insights'
import { formatCompactPercent, formatCurrency, formatPercent } from '@/lib/format'
import { fromDayKey } from '@/lib/date'
import type { ReportData } from '@/types'

const ROW = { pad: '9px 0', font: 23 }

function Th({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: INK.faint,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        textAlign: align,
        padding: '0 0 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = 'right',
  bold,
  color,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  bold?: boolean
  color?: string
}) {
  return (
    <td
      style={{
        fontSize: ROW.font,
        fontWeight: bold ? 700 : 500,
        color: color ?? INK.soft,
        textAlign: align,
        padding: ROW.pad,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {children}
    </td>
  )
}

/**
 * The whole month on one image: the headline figures, then every day as a table
 * laid out like the hotel's own sheet.
 *
 * Its height is not fixed. A five-day month would be mostly white space at the
 * height a thirty-one-day month needs, so the canvas grows with the rows and
 * the capture measures it rather than assuming.
 */
export function MonthReport({ data }: { data: ReportData }) {
  const { monthly } = data
  const hasTarget = monthly.monthlyTarget > 0
  const target = monthly.baseDailyTarget
  const rows = monthly.entries
  const insights = topInsights(
    data.insights.filter((i) => i.scope === 'month' && i.id !== 'pace' && i.id !== 'projection'),
    2,
  ).map((i) => i.text)

  const totals = rows.reduce(
    (a, e) => ({
      sale: a.sale + totalSalesOf(e),
      direct: a.direct + Math.max(0, directSalesOf(e)),
      swiggy: a.swiggy + e.swiggySales,
      zomato: a.zomato + e.zomatoSales,
      expenses: a.expenses + e.expenses,
    }),
    { sale: 0, direct: 0, swiggy: 0, zomato: 0, expenses: 0 },
  )
  const targetToDate = target * rows.length

  return (
    <div
      style={{
        width: REPORT_WIDTH,
        background: INK.paper,
        fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
        color: INK.text,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 12, background: INK.brand, width: '100%', flexShrink: 0 }} />

      <div style={{ padding: '30px 64px 0', display: 'flex', flexDirection: 'column' }}>
        <Masthead kicker="Month Report" title={monthly.monthLabel} />

        {/* --- headline --- */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <p style={{ fontSize: 22, color: INK.muted, margin: 0, fontWeight: 600 }}>
            {monthly.daysRemaining > 0 ? 'Sales So Far' : 'Total Sales'}
          </p>
          <p
            style={{
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: -3,
              margin: '4px 0 0',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(monthly.mtdSales)}
          </p>
        </div>

        {/* --- the boxes --- */}
        <div
          style={{
            marginTop: 20,
            padding: '20px 26px',
            background: INK.panel,
            border: `1px solid ${INK.panelLine}`,
            borderRadius: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', gap: 22 }}>
            <StatCell label="Monthly target" value={formatCurrency(monthly.monthlyTarget)} />
            <StatCell
              label="Achievement"
              value={hasTarget ? formatPercent(monthly.achievement) : '—'}
            />
            <StatCell
              label="Remaining"
              value={hasTarget ? formatCurrency(monthly.remaining) : '—'}
              color={monthly.remaining > 0 ? INK.text : INK.good}
            />
          </div>
          <div style={{ height: 1, background: INK.panelLine }} />
          <div style={{ display: 'flex', gap: 22 }}>
            <StatCell label="Average / day" value={formatCurrency(monthly.averageDailySales)} />
            <StatCell
              label="Needed / day"
              value={
                monthly.requiredDailyPace === null ? '—' : formatCurrency(monthly.requiredDailyPace)
              }
            />
            <StatCell
              label={monthly.daysRemaining === 0 ? 'Finished at' : 'May end at'}
              value={
                monthly.daysRemaining === 0
                  ? formatCurrency(monthly.mtdSales)
                  : monthly.projection.projected === null
                    ? '—'
                    : formatCurrency(monthly.projection.projected)
              }
            />
          </div>
          {hasTarget && (
            <div style={{ height: 12, borderRadius: 99, background: '#ece5dc', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, monthly.achievement ?? 0)}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: (monthly.achievement ?? 0) >= 100 ? '#15a05a' : INK.brand,
                }}
              />
            </div>
          )}
        </div>

        {/* --- day by day --- */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <SectionLabel>Day by Day</SectionLabel>
            <span style={{ fontSize: 20, color: INK.muted, fontWeight: 600 }}>
              Day {monthly.daysElapsed} of {monthly.daysInMonth} · {rows.length} recorded
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK.rule}` }}>
                <Th align="left">Day</Th>
                <Th>Sale</Th>
                <Th>{DIRECT_LABEL}</Th>
                <Th>Swiggy</Th>
                <Th>Zomato</Th>
                {hasTarget && <Th>Target</Th>}
                {hasTarget && <Th>%</Th>}
                <Th>Expenses</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, i) => {
                const sale = totalSalesOf(entry)
                const pct = hasTarget ? (sale / target) * 100 : null
                return (
                  <tr
                    key={entry.date}
                    style={{
                      borderBottom: `1px solid ${INK.rule}`,
                      background: i % 2 === 1 ? '#faf8f5' : 'transparent',
                    }}
                  >
                    <Td align="left" bold color={INK.text}>
                      {format(fromDayKey(entry.date), 'dd EEE')}
                    </Td>
                    <Td bold color={INK.text}>{formatCurrency(sale)}</Td>
                    <Td>{formatCurrency(Math.max(0, directSalesOf(entry)))}</Td>
                    <Td>{formatCurrency(entry.swiggySales)}</Td>
                    <Td>{formatCurrency(entry.zomatoSales)}</Td>
                    {hasTarget && <Td color={INK.muted}>{formatCurrency(target)}</Td>}
                    {hasTarget && (
                      <Td bold color={(pct ?? 0) >= 100 ? INK.good : INK.bad}>
                        {formatCompactPercent(pct)}
                      </Td>
                    )}
                    <Td color={INK.muted}>{formatCurrency(entry.expenses)}</Td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${INK.rule}`, background: INK.panel }}>
                <Td align="left" bold color={INK.text}>
                  {rows.length} {rows.length === 1 ? 'day' : 'days'}
                </Td>
                <Td bold color={INK.text}>{formatCurrency(totals.sale)}</Td>
                <Td bold color={INK.text}>{formatCurrency(totals.direct)}</Td>
                <Td bold color={INK.text}>{formatCurrency(totals.swiggy)}</Td>
                <Td bold color={INK.text}>{formatCurrency(totals.zomato)}</Td>
                {hasTarget && <Td bold color={INK.text}>{formatCurrency(targetToDate)}</Td>}
                {hasTarget && (
                  <Td bold color={totals.sale >= targetToDate ? INK.good : INK.bad}>
                    {formatCompactPercent((totals.sale / targetToDate) * 100)}
                  </Td>
                )}
                <Td bold color={INK.text}>{formatCurrency(totals.expenses)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* --- where it came from --- */}
        <div style={{ display: 'flex', gap: 30, marginTop: 26, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionLabel>Channels</SectionLabel>
            <div style={{ marginTop: 10 }}>
              <Bar
                total={monthly.channels.total}
                slices={[
                  { share: monthly.channels.directShare, color: CHANNEL_COLORS.direct },
                  { share: monthly.channels.swiggyShare, color: CHANNEL_COLORS.swiggy },
                  { share: monthly.channels.zomatoShare, color: CHANNEL_COLORS.zomato },
                ]}
              />
              <MeterRow label={DIRECT_LABEL} value={monthly.channels.direct} share={monthly.channels.directShare} color={CHANNEL_COLORS.direct} format={formatCurrency} compact />
              <MeterRow label="Swiggy" value={monthly.channels.swiggy} share={monthly.channels.swiggyShare} color={CHANNEL_COLORS.swiggy} format={formatCurrency} compact />
              <MeterRow label="Zomato" value={monthly.channels.zomato} share={monthly.channels.zomatoShare} color={CHANNEL_COLORS.zomato} format={formatCurrency} compact />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionLabel>{monthly.food.recorded ? 'Veg / Non-Veg' : 'Expenses'}</SectionLabel>
            {monthly.food.recorded ? (
              <div style={{ marginTop: 10 }}>
                <Bar
                  total={monthly.food.foodTotal}
                  slices={[
                    { share: monthly.food.vegShare, color: FOOD_COLORS.veg },
                    { share: monthly.food.nonVegShare, color: FOOD_COLORS.nonVeg },
                  ]}
                />
                <MeterRow label="Veg" value={monthly.food.veg} share={monthly.food.vegShare} color={FOOD_COLORS.veg} format={formatCurrency} compact />
                <MeterRow label="Non-Veg" value={monthly.food.nonVeg} share={monthly.food.nonVegShare} color={FOOD_COLORS.nonVeg} format={formatCurrency} compact />
                <p style={{ margin: '8px 0 0', fontSize: 20, color: INK.muted, fontWeight: 600 }}>
                  Expenses {formatCurrency(monthly.mtdExpenses)} · after expenses{' '}
                  {formatCurrency(monthly.mtdSalesAfterExpenses)}
                </p>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 40, fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(monthly.mtdExpenses)}
                </p>
                <p style={{ fontSize: 20, color: INK.muted, margin: '4px 0 0', fontWeight: 600 }}>
                  Sales after expenses {formatCurrency(monthly.mtdSalesAfterExpenses)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 22, marginBottom: 20 }}>
          <Verdict
            tone={monthly.status.tone}
            emoji={monthly.status.emoji}
            label={monthly.status.label}
            detail={monthly.status.detail}
            bullets={insights}
          />
        </div>
      </div>

      <ReportFooter generatedAt={data.generatedAt ? toKey(data.generatedAt) : monthly.asOf} />
    </div>
  )
}

function toKey(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
