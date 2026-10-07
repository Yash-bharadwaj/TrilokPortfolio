import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  calculateDailyMetrics,
  calculateMonthlyMetrics,
  calculateChannelBreakdown,
  calculateFoodBreakdown,
} from '../engine'
import { totalSalesOf } from '../config'
import { daysInMonthOf } from '@/lib/date'
import { formatCurrency, formatSignedCurrency, groupDigits } from '@/lib/format'
import type { DailySales } from '@/types'

const day = (date: string, net: number, swiggy = 0, zomato = 0, extra: Partial<DailySales> = {}): DailySales => ({
  date,
  netSales: net,
  swiggySales: swiggy,
  zomatoSales: zomato,
  vegSales: 0,
  nonVegSales: 0,
  expenses: 0,
  ...extra,
})

// The five reference days from the brief's handwritten sheet.
const OCT = [
  day('2026-10-01', 38456, 7922, 5204),
  day('2026-10-02', 53685, 3694, 5503),
  day('2026-10-03', 55810, 3618, 6448),
  day('2026-10-04', 41866, 7785, 9596),
  day('2026-10-05', 51831, 5326, 6376),
]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 5, 12, 0, 0)) // 5 Oct 2026, local noon
})
afterEach(() => vi.useRealTimers())

describe('sales model', () => {
  it('adds the aggregators on top of restaurant sales', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    // 2,41,648 restaurant + 28,345 Swiggy + 33,127 Zomato
    expect(m.mtdNetSales).toBe(241648)
    expect(m.mtdSales).toBe(303120)
  })

  it('matches the brief’s own history rows, which use the summed total', () => {
    // §17 lists 3 Oct as ₹65,876 and 4 Oct as ₹59,247.
    expect(totalSalesOf(OCT[2]!)).toBe(65876)
    expect(totalSalesOf(OCT[3]!)).toBe(59247)
  })

  it('splits channels so direct + swiggy + zomato equals the total', () => {
    const c = calculateChannelBreakdown(OCT)
    expect(c.direct + c.swiggy + c.zomato).toBe(c.total)
    expect(c.total).toBe(303120)
    expect(c.direct).toBe(241648)
    expect(c.swiggy).toBe(28345)
    expect(c.zomato).toBe(33127)
    expect(c.inconsistent).toBe(false)
  })

  it('cannot produce a negative restaurant figure under this model', () => {
    // Aggregators add on top, so large Swiggy/Zomato can never eat into it.
    const c = calculateChannelBreakdown([day('2026-10-01', 1000, 800, 500)])
    expect(c.direct).toBe(1000)
    expect(c.total).toBe(2300)
    expect(c.inconsistent).toBe(false)
  })
})

describe('monthly metrics', () => {
  it('computes achievement, remaining and pace for a 31-day month', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    expect(m.daysInMonth).toBe(31)
    expect(m.daysElapsed).toBe(5)
    expect(m.daysRemaining).toBe(26)
    expect(m.achievement).toBeCloseTo(101.04, 2)
    expect(m.remaining).toBe(0)
    expect(m.baseDailyTarget).toBeCloseTo(300000 / 31, 6)
    expect(m.expectedToDate).toBeCloseTo((300000 / 31) * 5, 6)
    expect(m.averageDailySales).toBeCloseTo(303120 / 5, 6)
    expect(m.requiredDailyPace).toBe(0)
  })

  it('projects month-end from the running average', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    expect(m.projection.projected).toBeCloseTo((303120 / 5) * 31, 4)
    expect(m.projection.lowConfidence).toBe(false)
    expect(m.projection.varianceToTarget).toBeGreaterThan(0)
  })

  it('marks a projection from fewer than three days as low confidence', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT.slice(0, 2), 300000)
    expect(m.projection.lowConfidence).toBe(true)
  })

  it('reports ahead of target when sales beat the straight-line pace', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    expect(m.status.tone).toBe('ahead')
  })

  it('reports behind target when sales trail the pace', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 2000000)
    expect(m.status.tone).toBe('behind')
    expect(m.status.detail).toContain('per day')
  })

  it('reports on track inside the tolerance band', () => {
    // Target chosen so the expected-to-date equals MTD sales exactly.
    const target = (303120 / 5) * 31
    const m = calculateMonthlyMetrics('2026-10', OCT, target)
    expect(m.status.tone).toBe('on-track')
  })
})

describe('historical month-to-date', () => {
  it('excludes days after the report date', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000, '2026-10-03')
    expect(m.mtdSales).toBe(51582 + 62882 + 65876)
    expect(m.entries.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(m.daysElapsed).toBe(3)
    expect(m.daysRemaining).toBe(28)
  })

  it('never lets 4 or 5 October leak into a 3 October report', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000, '2026-10-03')
    expect(m.entries.some((e) => e.date > '2026-10-03')).toBe(false)
    expect(m.mtdSales).not.toBe(303120)
  })

  it('scopes the channel split to the report date too', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000, '2026-10-02')
    expect(m.channels.swiggy).toBe(7922 + 3694)
    expect(m.channels.zomato).toBe(5204 + 5503)
  })
})

describe('month lengths', () => {
  it('handles a 30-day month', () => {
    expect(daysInMonthOf('2026-09')).toBe(30)
    const m = calculateMonthlyMetrics('2026-09', [], 60000)
    expect(m.baseDailyTarget).toBe(2000)
  })

  it('handles a 31-day month', () => {
    const m = calculateMonthlyMetrics('2026-10', [], 60000)
    expect(m.baseDailyTarget).toBeCloseTo(1935.4838, 3)
  })

  it('handles a non-leap February', () => {
    expect(daysInMonthOf('2026-02')).toBe(28)
    expect(calculateMonthlyMetrics('2026-02', [], 60000).baseDailyTarget).toBeCloseTo(60000 / 28, 6)
  })

  it('handles a leap February', () => {
    expect(daysInMonthOf('2028-02')).toBe(29)
    expect(daysInMonthOf('2000-02')).toBe(29)
    expect(daysInMonthOf('1900-02')).toBe(28)
    expect(calculateMonthlyMetrics('2028-02', [], 60000).baseDailyTarget).toBeCloseTo(60000 / 29, 6)
  })
})

describe('edge cases', () => {
  it('never divides by zero when the target is zero', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 0)
    expect(m.achievement).toBeNull()
    expect(Number.isFinite(m.baseDailyTarget)).toBe(true)
    expect(m.baseDailyTarget).toBe(0)
    expect(m.status.tone).toBe('unknown')
    expect(m.projection.varianceToTarget).toBeNull()
  })

  it('does not project from an empty month', () => {
    const m = calculateMonthlyMetrics('2026-10', [], 300000)
    expect(m.mtdSales).toBe(0)
    expect(m.averageDailySales).toBeNull()
    expect(m.projection.projected).toBeNull()
    expect(m.projection.lowConfidence).toBe(true)
  })

  it('averages over recorded days, not calendar days', () => {
    // Only two of the five elapsed days were recorded.
    const m = calculateMonthlyMetrics('2026-10', [OCT[0], OCT[4]], 300000)
    expect(m.daysRecorded).toBe(2)
    expect(m.daysElapsed).toBe(5)
    expect(m.averageDailySales).toBeCloseTo((51582 + 63533) / 2, 6)
  })

  it('gives no required pace once the month is over', () => {
    const m = calculateMonthlyMetrics('2026-09', [day('2026-09-30', 1000)], 60000)
    expect(m.daysRemaining).toBe(0)
    expect(m.requiredDailyPace).toBeNull()
  })

  it('handles very large values without losing precision', () => {
    const m = calculateMonthlyMetrics('2026-10', [day('2026-10-01', 99_000_000)], 100_000_000)
    expect(m.mtdSales).toBe(99_000_000)
    expect(m.achievement).toBeCloseTo(99, 6)
  })
})

describe('daily metrics', () => {
  it('computes variance against the base daily target', () => {
    const d = calculateDailyMetrics('2026-10-05', OCT[4], 300000)
    expect(d.totalSales).toBe(63533)
    expect(d.netSales).toBe(51831)
    expect(d.baseDailyTarget).toBeCloseTo(300000 / 31, 6)
    expect(d.variance).toBeCloseTo(63533 - 300000 / 31, 6)
    expect(d.achievement).toBeCloseTo((63533 / (300000 / 31)) * 100, 6)
  })

  it('returns a null achievement for a day with no record', () => {
    const d = calculateDailyMetrics('2026-10-06', null, 300000)
    expect(d.entry).toBeNull()
    expect(d.totalSales).toBe(0)
    expect(d.achievement).toBeNull()
  })

  it('subtracts expenses without calling the result profit', () => {
    const d = calculateDailyMetrics('2026-10-05', day('2026-10-05', 50000, 0, 0, { expenses: 12000 }), 300000)
    expect(d.salesAfterExpenses).toBe(38000)
  })
})

describe('food breakdown', () => {
  it('splits veg and non-veg by share of itemised food', () => {
    const f = calculateFoodBreakdown([day('2026-10-01', 123000, 0, 0, { vegSales: 75000, nonVegSales: 48000 })])
    expect(f.foodTotal).toBe(123000)
    expect(f.vegShare).toBeCloseTo(60.97, 1)
    expect(f.nonVegShare).toBeCloseTo(39.02, 1)
    expect(f.coverage).toBeCloseTo(100, 4)
    expect(f.recorded).toBe(true)
  })

  it('reports nothing recorded when veg and non-veg are blank', () => {
    const f = calculateFoodBreakdown(OCT)
    expect(f.recorded).toBe(false)
    expect(f.vegShare).toBe(0)
  })
})

describe('indian currency formatting', () => {
  it('groups lakhs the Indian way', () => {
    expect(formatCurrency(51831)).toBe('₹51,831')
    expect(formatCurrency(241648)).toBe('₹2,41,648')
    expect(formatCurrency(300000)).toBe('₹3,00,000')
    expect(formatCurrency(10000000)).toBe('₹1,00,00,000')
  })

  it('always carries a sign on variances', () => {
    expect(formatSignedCurrency(3120)).toBe('+₹3,120')
    expect(formatSignedCurrency(-753)).toBe('−₹753')
    expect(formatSignedCurrency(0)).toBe('₹0')
  })

  it('shows an em dash rather than NaN', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(Number.NaN)).toBe('—')
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('groups digits live as they are typed', () => {
    expect(groupDigits('50000')).toBe('50,000')
    expect(groupDigits('241648')).toBe('2,41,648')
    expect(groupDigits('abc12x3')).toBe('123')
    expect(groupDigits('')).toBe('')
    expect(groupDigits('000500')).toBe('500')
  })
})

describe('totals', () => {
  it('credits restaurant plus aggregators as the day total', () => {
    expect(totalSalesOf(OCT[0]!)).toBe(38456 + 7922 + 5204)
    expect(totalSalesOf(OCT[0]!)).toBe(51582)
  })
})

// ---------------------------------------------------------------------------
// Features added after the first release
// ---------------------------------------------------------------------------
import { calculateWeekdayPattern } from '../patterns'
import { findMissingDays } from '../gaps'
import { compareToPreviousMonth } from '../comparison'
import { generateInsights } from '../insights'
import type { Insight } from '@/types'
import { buildMonthCsv } from '@/lib/csv'

describe('missing days', () => {
  it('lists elapsed days of the month with no record', () => {
    const missing = findMissingDays('2026-10', [OCT[0], OCT[2]], '2026-10-05')
    expect(missing).toEqual(['2026-10-02', '2026-10-04', '2026-10-05'])
  })

  it('never reports days that have not happened yet', () => {
    const missing = findMissingDays('2026-10', OCT, '2026-10-05')
    expect(missing).toEqual([])
  })

  it('reports the whole elapsed month when nothing is recorded', () => {
    expect(findMissingDays('2026-10', [], '2026-10-03')).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ])
  })
})

describe('weekday pattern', () => {
  const march = Array.from({ length: 14 }, (_, i) =>
    day(`2026-03-${String(i + 1).padStart(2, '0')}`, i % 7 === 0 ? 90000 : 30000),
  )

  it('averages each weekday over the days recorded for it', () => {
    const p = calculateWeekdayPattern(march)
    // 1 March 2026 is a Sunday, and every 7th day from it is the big one.
    expect(p.best?.shortLabel).toBe('Sun')
    expect(p.best?.average).toBe(90000)
    expect(p.best?.days).toBe(2)
    expect(p.reliable).toBe(true)
  })

  it('measures how far the best day sits above the overall average', () => {
    const p = calculateWeekdayPattern(march)
    const overall = (90000 * 2 + 30000 * 12) / 14
    expect(p.overallAverage).toBeCloseTo(overall, 6)
    expect(p.bestLift).toBeCloseTo(((90000 - overall) / overall) * 100, 6)
  })

  it('refuses to claim a pattern from too little data', () => {
    expect(calculateWeekdayPattern(OCT).reliable).toBe(false)
    expect(calculateWeekdayPattern([]).best).toBeNull()
    expect(calculateWeekdayPattern([]).overallAverage).toBeNull()
  })
})

describe('previous-month comparison', () => {
  const sept = [
    day('2026-09-01', 30000),
    day('2026-09-02', 40000),
    day('2026-09-03', 50000),
    day('2026-09-28', 99000), // outside the 5-day window
  ]

  it('compares like for like, trimming the previous month to the days elapsed', () => {
    const current = calculateMonthlyMetrics('2026-10', OCT, 300000)
    const c = compareToPreviousMonth(current, '2026-09', sept)!
    expect(c.daysCompared).toBe(5)
    expect(c.trimmed).toBe(true)
    expect(c.previousTotal).toBe(120000) // 28 Sept excluded
    expect(c.currentTotal).toBe(303120)
    expect(c.change).toBe(183120)
    expect(c.changePercent).toBeCloseTo((183120 / 120000) * 100, 6)
  })

  it('returns nothing when the previous month has no data in range', () => {
    const current = calculateMonthlyMetrics('2026-10', OCT, 300000)
    expect(compareToPreviousMonth(current, '2026-09', [])).toBeNull()
    expect(compareToPreviousMonth(current, '2026-09', [day('2026-09-28', 1000)])).toBeNull()
  })
})

describe('csv export', () => {
  it('writes plain numbers and a totals row', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    const csv = buildMonthCsv(m)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Sai Brundavan Grand')
    expect(lines[2]).toContain('Date,Day,Total Sales,Restaurant')
    expect(csv).toContain('2026-10-01')
    // numbers, not formatted currency
    expect(csv).not.toContain('₹2,41,648')
    expect(csv).toContain('303120')
    expect(lines[lines.length - 1]).toContain('TOTAL')
  })

  it('quotes a note containing a comma', () => {
    const m = calculateMonthlyMetrics('2026-10', [day('2026-10-01', 100, 0, 0, { note: 'Diwali, busy' })], 300000)
    expect(buildMonthCsv(m)).toContain('"Diwali, busy"')
  })
})

describe('a finished month reads as a result, not a pace', () => {
  it('says the target was missed rather than "behind pace"', () => {
    const m = calculateMonthlyMetrics('2026-09', [day('2026-09-30', 1000)], 60000)
    expect(m.daysRemaining).toBe(0)
    expect(m.status.label).toBe('Target Missed')
    expect(m.status.detail).toContain('finished')
    expect(m.status.detail).not.toContain('per day')
  })

  it('says the target was beaten when it was', () => {
    const m = calculateMonthlyMetrics('2026-09', [day('2026-09-30', 90000)], 60000)
    expect(m.status.label).toBe('Target Beaten')
    expect(m.status.detail).toContain('above the target')
  })
})

describe('insight scope', () => {
  const withFood = OCT.map((e) => ({ ...e, vegSales: 1000, nonVegSales: 500, expenses: 4000 }))

  it('tags every insight as day or month', () => {
    const monthly = calculateMonthlyMetrics('2026-10', withFood, 300000)
    const daily = calculateDailyMetrics('2026-10-05', withFood[4]!, 300000)
    const all = generateInsights(daily, monthly)
    expect(all.length).toBeGreaterThan(3)
    expect(all.every((i: Insight) => i.scope === 'day' || i.scope === 'month')).toBe(true)
  })

  it('keeps "today" statements out of the month-scoped set', () => {
    const monthly = calculateMonthlyMetrics('2026-10', withFood, 300000)
    const daily = calculateDailyMetrics('2026-10-05', withFood[4]!, 300000)
    const monthOnly = generateInsights(daily, monthly).filter((i: Insight) => i.scope === 'month')
    expect(monthOnly.length).toBeGreaterThan(0)
    for (const insight of monthOnly) {
      expect(insight.text).not.toMatch(/today/i)
      expect(insight.text).not.toMatch(/previous recorded day/i)
    }
  })
})
