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
  it('reproduces the brief’s month-to-date total from net sales alone', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    expect(m.mtdSales).toBe(241648)
  })

  it('splits channels so direct + swiggy + zomato equals the total', () => {
    const c = calculateChannelBreakdown(OCT)
    expect(c.direct + c.swiggy + c.zomato).toBe(c.total)
    expect(c.total).toBe(241648)
    expect(c.inconsistent).toBe(false)
  })

  it('flags an entry where the aggregators exceed the recorded total', () => {
    const c = calculateChannelBreakdown([day('2026-10-01', 1000, 800, 500)])
    expect(c.inconsistent).toBe(true)
    expect(c.direct).toBe(0)
  })
})

describe('monthly metrics', () => {
  it('computes achievement, remaining and pace for a 31-day month', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    expect(m.daysInMonth).toBe(31)
    expect(m.daysElapsed).toBe(5)
    expect(m.daysRemaining).toBe(26)
    expect(m.achievement).toBeCloseTo(80.549, 2)
    expect(m.remaining).toBe(58352)
    expect(m.baseDailyTarget).toBeCloseTo(300000 / 31, 6)
    expect(m.expectedToDate).toBeCloseTo((300000 / 31) * 5, 6)
    expect(m.averageDailySales).toBeCloseTo(241648 / 5, 6)
    expect(m.requiredDailyPace).toBeCloseTo(58352 / 26, 6)
  })

  it('projects month-end from the running average', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000)
    expect(m.projection.projected).toBeCloseTo((241648 / 5) * 31, 4)
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
    const target = (241648 / 5) * 31
    const m = calculateMonthlyMetrics('2026-10', OCT, target)
    expect(m.status.tone).toBe('on-track')
  })
})

describe('historical month-to-date', () => {
  it('excludes days after the report date', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000, '2026-10-03')
    expect(m.mtdSales).toBe(38456 + 53685 + 55810)
    expect(m.entries.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(m.daysElapsed).toBe(3)
    expect(m.daysRemaining).toBe(28)
  })

  it('never lets 4 or 5 October leak into a 3 October report', () => {
    const m = calculateMonthlyMetrics('2026-10', OCT, 300000, '2026-10-03')
    expect(m.entries.some((e) => e.date > '2026-10-03')).toBe(false)
    expect(m.mtdSales).not.toBe(241648)
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
    expect(m.averageDailySales).toBeCloseTo((38456 + 51831) / 2, 6)
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
    expect(d.totalSales).toBe(51831)
    expect(d.baseDailyTarget).toBeCloseTo(300000 / 31, 6)
    expect(d.variance).toBeCloseTo(51831 - 300000 / 31, 6)
    expect(d.achievement).toBeCloseTo((51831 / (300000 / 31)) * 100, 6)
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
  it('credits the day total under the active model', () => {
    expect(totalSalesOf(OCT[0])).toBe(38456)
  })
})
