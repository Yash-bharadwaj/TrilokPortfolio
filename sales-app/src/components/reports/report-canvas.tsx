import { forwardRef } from 'react'
import { brundavanLogoSrc } from '@/components/brand'
import { CHANNEL_COLORS, FOOD_COLORS } from '@/lib/chart-palette'
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from '@/lib/format'
import { formatLongDate, todayKey } from '@/lib/date'
import { DIRECT_LABEL, HOTEL, REPORT_SIGNATURE } from '@/calculations/config'
import { MonthReport } from './month-report'
import type { ReportData } from '@/types'

import { DAILY_REPORT_HEIGHT, REPORT_WIDTH } from './report-parts'

export { REPORT_WIDTH }
export const REPORT_HEIGHT = DAILY_REPORT_HEIGHT

const TONE_STYLE = {
  ahead: { bg: '#eefaf2', border: '#9fe0bb', text: '#0d6b3d' },
  'on-track': { bg: '#f5f2ee', border: '#ddd4c8', text: '#3b322d' },
  behind: { bg: '#fdf5e7', border: '#efcf96', text: '#8a5a08' },
  unknown: { bg: '#f5f2ee', border: '#ddd4c8', text: '#6b625c' },
} as const

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 19,
        letterSpacing: 2.6,
        fontWeight: 700,
        color: '#9a8f87',
        textTransform: 'uppercase',
        margin: 0,
      }}
    >
      {children}
    </p>
  )
}

function Rule() {
  return <div style={{ height: 1, background: '#eae3da', width: '100%' }} />
}

function StatCell({
  label,
  value,
  sub,
  color = '#1a1614',
}: {
  label: string
  value: string
  /** A small second line, for a figure that would crowd the main one. */
  sub?: string
  color?: string
}) {
  // Long rupee figures would otherwise run past the column at the full size.
  const size = value.length > 12 ? 30 : value.length > 10 ? 34 : 38
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 19, color: '#8d837c', margin: 0, fontWeight: 600 }}>{label}</p>
      <p
        style={{
          fontSize: size,
          fontWeight: 700,
          color,
          margin: '6px 0 0',
          letterSpacing: -0.8,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'clip',
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 19,
            fontWeight: 600,
            color,
            opacity: 0.7,
            margin: '2px 0 0',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function MeterRow({
  label,
  value,
  share,
  color,
  compact,
}: {
  label: string
  value: number
  share: number
  color: string
  compact?: boolean
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: compact ? '2px 0' : '4px 0' }}
    >
      <span style={{ width: 13, height: 13, borderRadius: 99, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 24, fontWeight: 600, color: '#3b322d' }}>{label}</span>
      <span
        style={{
          fontSize: 25,
          fontWeight: 700,
          color: '#1a1614',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCurrency(value)}
      </span>
      <span
        style={{
          width: 96,
          textAlign: 'right',
          fontSize: 23,
          color: '#8d837c',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatPercent(share)}
      </span>
    </div>
  )
}

function Bar({ slices, total }: { slices: { share: number; color: string }[]; total: number }) {
  if (total <= 0) return null
  return (
    <div
      style={{
        display: 'flex',
        height: 14,
        borderRadius: 99,
        overflow: 'hidden',
        background: '#f0ebe4',
        gap: 2,
      }}
    >
      {slices
        .filter((s) => s.share > 0)
        .map((s, i) => (
          <div key={i} style={{ width: `${Math.max(1, s.share)}%`, background: s.color }} />
        ))}
    </div>
  )
}

/**
 * The shared artefact. Rendered at a fixed 1080×1350 regardless of the phone it
 * was generated on, so every report the owner receives looks identical.
 */
export const ReportCanvas = forwardRef<HTMLDivElement, { data: ReportData }>(
  function ReportCanvas({ data }, ref) {
    // The month report is its own layout: it carries a table of every day and
    // so has no fixed height.
    if (data.kind === 'mtd') {
      return (
        <div ref={ref} style={{ width: REPORT_WIDTH }}>
          <MonthReport data={data} />
        </div>
      )
    }

    const { daily, monthly } = data
    const tight = false
    const tone = TONE_STYLE[monthly.status.tone]
    const hasTarget = monthly.monthlyTarget > 0

    const heroLabel = daily.date === todayKey() ? "Today's Sales" : "Day's Sales"
    const heroValue = daily.totalSales
    const channels = daily.channels
    const food = daily.food
    const expenses = daily.expenses
    const achievementPct = Math.min(100, monthly.achievement ?? 0)

    /*
     * Only the month report carries insights; the daily one already covers the
     * same ground in full. Day-scoped statements are excluded outright — an
     * owner opening the month report a week later should never read "today's
     * sales are…". The pace line is dropped because the verdict above states
     * it, and the projection because the figure beside it already does.
     */

    return (
      <div
        ref={ref}
        style={{
          width: REPORT_WIDTH,
          height: REPORT_HEIGHT,
          background: '#fffdfb',
          fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
          color: '#1a1614',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ height: 12, background: '#8f1d2c', width: '100%', flexShrink: 0 }} />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '30px 64px 0',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* --- masthead --- */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img
              src={brundavanLogoSrc}
              alt="Sai Brundavan Grand"
              width={805}
              height={212}
              style={{ width: 312, height: 82, objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 40, height: 1, background: '#d8cec3' }} />
              <SectionLabel>Daily Sales Report</SectionLabel>
              <span style={{ width: 40, height: 1, background: '#d8cec3' }} />
            </div>
            <p
              style={{
                fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif",
                fontSize: 32,
                fontWeight: 600,
                margin: 0,
                color: '#3b322d',
              }}
            >
              {formatLongDate(daily.date)}
            </p>
          </div>

          {/* --- hero --- */}
          <div style={{ textAlign: 'center', marginTop: tight ? 14 : 18 }}>
            <p style={{ fontSize: 22, color: '#8d837c', margin: 0, fontWeight: 600 }}>{heroLabel}</p>
            <p
              style={{
                fontSize: tight ? 80 : 88,
                fontWeight: 800,
                letterSpacing: -3,
                margin: '4px 0 0',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrency(heroValue)}
            </p>
          </div>

          {/* --- headline stats --- */}
          <div
            style={{
              display: 'flex',
              gap: 22,
              marginTop: tight ? 14 : 18,
              padding: tight ? '14px 26px' : '17px 26px',
              background: '#faf7f3',
              border: '1px solid #eee7de',
              borderRadius: 18,
            }}
          >
            <>
                <StatCell label="Target" value={formatCurrency(daily.baseDailyTarget)} />
                <StatCell
                  label="Achievement"
                  value={hasTarget ? formatPercent(daily.achievement) : '—'}
                />
                <StatCell
                  label="vs Target"
                  value={hasTarget ? formatSignedCurrency(daily.variance) : '—'}
                  sub={
                    hasTarget && daily.baseDailyTarget > 0
                      ? formatSignedPercent((daily.variance / daily.baseDailyTarget) * 100)
                      : undefined
                  }
                  color={daily.variance >= 0 ? '#0d6b3d' : '#a4162e'}
                />
              </>
          </div>

          {/* --- breakdown --- */}
          <div style={{ marginTop: tight ? 12 : 16 }}>
            <SectionLabel>Sales Channels</SectionLabel>
            <div style={{ marginTop: 12 }}>
              <Bar
                total={channels.total}
                slices={[
                  { share: channels.directShare, color: CHANNEL_COLORS.direct },
                  { share: channels.swiggyShare, color: CHANNEL_COLORS.swiggy },
                  { share: channels.zomatoShare, color: CHANNEL_COLORS.zomato },
                ]}
              />
              <div style={{ marginTop: 6 }}>
                <MeterRow
                  label={DIRECT_LABEL}
                  value={channels.direct}
                  share={channels.directShare}
                  color={CHANNEL_COLORS.direct}
                  compact={tight}
                />
                <MeterRow
                  label="Swiggy"
                  value={channels.swiggy}
                  share={channels.swiggyShare}
                  color={CHANNEL_COLORS.swiggy}
                  compact={tight}
                />
                <MeterRow
                  label="Zomato"
                  value={channels.zomato}
                  share={channels.zomatoShare}
                  color={CHANNEL_COLORS.zomato}
                  compact={tight}
                />
              </div>
            </div>
          </div>

          {(food.recorded || expenses > 0) && (
            <>
              <div style={{ marginTop: 10 }}>
                <Rule />
              </div>
              <div style={{ display: 'flex', gap: 28, marginTop: tight ? 10 : 14, alignItems: 'flex-start' }}>
                {food.recorded && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SectionLabel>Veg / Non-Veg</SectionLabel>
                    <div style={{ marginTop: 10 }}>
                      <Bar
                        total={food.foodTotal}
                        slices={[
                          { share: food.vegShare, color: FOOD_COLORS.veg },
                          { share: food.nonVegShare, color: FOOD_COLORS.nonVeg },
                        ]}
                      />
                      <MeterRow
                        label="Veg"
                        value={food.veg}
                        share={food.vegShare}
                        color={FOOD_COLORS.veg}
                        compact={tight}
                      />
                      <MeterRow
                        label="Non-Veg"
                        value={food.nonVeg}
                        share={food.nonVegShare}
                        color={FOOD_COLORS.nonVeg}
                        compact={tight}
                      />
                    </div>
                  </div>
                )}
                {expenses > 0 && (
                  <div style={{ width: food.recorded ? 290 : '100%' }}>
                    <SectionLabel>Expenses</SectionLabel>
                    <p
                      style={{
                        fontSize: 40,
                        fontWeight: 700,
                        margin: '10px 0 0',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCurrency(expenses)}
                    </p>
                    <p style={{ fontSize: 19, color: '#8d837c', margin: '4px 0 0', fontWeight: 600 }}>
                      Sales after expenses{' '}
                      {formatCurrency(daily.salesAfterExpenses)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ flex: 1, minHeight: 14 }} />

          {/* --- month to date / month detail --- */}
          <div
            style={{
              borderRadius: 18,
              border: '1px solid #eee7de',
              background: '#faf7f3',
              padding: tight ? '13px 26px' : '15px 26px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <SectionLabel>
                {`Month to Date · ${monthly.monthLabel}`}
              </SectionLabel>
              <span
                style={{
                  fontSize: 20,
                  color: '#8d837c',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Day {monthly.daysElapsed} of {monthly.daysInMonth}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 22, marginTop: 13 }}>
                <StatCell label="Sales" value={formatCurrency(monthly.mtdSales)} />
                <StatCell label="Target" value={formatCurrency(monthly.monthlyTarget)} />
                <StatCell
                  label="Achieved"
                  value={hasTarget ? formatPercent(monthly.achievement) : '—'}
                />
                <StatCell
                  label="Remaining"
                  value={hasTarget ? formatCurrency(monthly.remaining) : '—'}
                />
              </div>

            {hasTarget && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    height: 12,
                    borderRadius: 99,
                    background: '#ece5dc',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${achievementPct}%`,
                      height: '100%',
                      borderRadius: 99,
                      background: (monthly.achievement ?? 0) >= 100 ? '#15a05a' : '#8f1d2c',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* --- verdict, and on a month report what it means --- */}
          <div
            style={{
              marginTop: tight ? 11 : 14,
              borderRadius: 16,
              border: `1px solid ${tone.border}`,
              background: tone.bg,
              padding: '13px 22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 34, lineHeight: 1 }}>{monthly.status.emoji}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 27, fontWeight: 800, color: tone.text }}>
                  {monthly.status.label}
                </p>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: 19,
                    color: tone.text,
                    opacity: 0.88,
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {monthly.status.detail}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* --- footer --- */}
        <div
          style={{
            flexShrink: 0,
            marginTop: 18,
            borderTop: '1px solid #eae3da',
            padding: '15px 64px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 0.4 }}>
              {HOTEL.name.toUpperCase()}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 19, color: '#8d837c' }}>
              {HOTEL.addressLine2} · {HOTEL.phone}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#3b322d' }}>
              Generated &amp; curated by {REPORT_SIGNATURE.name}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 18, color: '#9a8f87' }}>
              {REPORT_SIGNATURE.role} ·{' '}
              {formatLongDate(data.generatedAt ? toKey(data.generatedAt) : daily.date)}
            </p>
          </div>
        </div>
      </div>
    )
  },
)

function toKey(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
