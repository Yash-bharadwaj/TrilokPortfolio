import type {
  ChannelBreakdown,
  DailyMetrics,
  DailySales,
  FoodBreakdown,
  MonthlyMetrics,
  PerformanceStatus,
  Projection,
} from '@/types'
import {
  MIN_DAYS_FOR_CONFIDENT_PROJECTION,
  PACE_TOLERANCE,
  directSalesOf,
  totalSalesOf,
} from './config'
import {
  dayOfMonth,
  daysInMonthOf,
  formatMonthLabel,
  lastDayKey,
  monthKeyOfDay,
  todayKey,
} from '@/lib/date'

const EMPTY_ENTRY: Omit<DailySales, 'date'> = {
  netSales: 0,
  swiggySales: 0,
  zomatoSales: 0,
  vegSales: 0,
  nonVegSales: 0,
  expenses: 0,
}

function share(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0
}

/** Guarded division — a zero target must never produce Infinity or NaN in the UI. */
function safeDivide(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null
}

export function calculateChannelBreakdown(entries: DailySales[]): ChannelBreakdown {
  const total = entries.reduce((sum, e) => sum + totalSalesOf(e), 0)
  const swiggy = entries.reduce((sum, e) => sum + e.swiggySales, 0)
  const zomato = entries.reduce((sum, e) => sum + e.zomatoSales, 0)
  const rawDirect = entries.reduce((sum, e) => sum + directSalesOf(e), 0)
  const inconsistent = rawDirect < 0
  const direct = Math.max(0, rawDirect)

  return {
    total,
    direct,
    swiggy,
    zomato,
    directShare: share(direct, total),
    swiggyShare: share(swiggy, total),
    zomatoShare: share(zomato, total),
    inconsistent,
  }
}

export function calculateFoodBreakdown(entries: DailySales[]): FoodBreakdown {
  const veg = entries.reduce((sum, e) => sum + e.vegSales, 0)
  const nonVeg = entries.reduce((sum, e) => sum + e.nonVegSales, 0)
  const foodTotal = veg + nonVeg
  const total = entries.reduce((sum, e) => sum + totalSalesOf(e), 0)

  return {
    veg,
    nonVeg,
    foodTotal,
    vegShare: share(veg, foodTotal),
    nonVegShare: share(nonVeg, foodTotal),
    coverage: share(foodTotal, total),
    recorded: foodTotal > 0,
  }
}

export function calculateDailyMetrics(
  date: string,
  entry: DailySales | null,
  monthlyTarget: number,
): DailyMetrics {
  const monthKey = monthKeyOfDay(date)
  const baseDailyTarget = monthlyTarget / daysInMonthOf(monthKey)
  const source: DailySales = entry ?? { date, ...EMPTY_ENTRY }
  const list = entry ? [entry] : []

  const totalSales = entry ? totalSalesOf(source) : 0
  const expenses = source.expenses

  return {
    date,
    entry,
    totalSales,
    netSales: source.netSales,
    expenses,
    salesAfterExpenses: totalSales - expenses,
    baseDailyTarget,
    variance: totalSales - baseDailyTarget,
    achievement: entry ? safeDivide(totalSales * 100, baseDailyTarget) : null,
    channels: calculateChannelBreakdown(list),
    food: calculateFoodBreakdown(list),
  }
}

export function calculateProjection(
  averageDailySales: number | null,
  daysInMonth: number,
  daysRecorded: number,
  monthlyTarget: number,
): Projection {
  if (averageDailySales === null || daysRecorded === 0) {
    return { projected: null, varianceToTarget: null, lowConfidence: true }
  }
  const projected = averageDailySales * daysInMonth
  return {
    projected,
    varianceToTarget: monthlyTarget > 0 ? projected - monthlyTarget : null,
    lowConfidence: daysRecorded < MIN_DAYS_FOR_CONFIDENT_PROJECTION,
  }
}

export function calculatePerformanceStatus(
  mtdSales: number,
  expectedToDate: number,
  monthlyTarget: number,
  requiredDailyPace: number | null,
  daysRemaining: number,
): PerformanceStatus {
  const paceVariance = mtdSales - expectedToDate

  if (monthlyTarget <= 0) {
    return {
      tone: 'unknown',
      label: 'No target set',
      emoji: '🎯',
      detail: 'Set a monthly target to track performance against a goal.',
      paceVariance: 0,
    }
  }
  if (expectedToDate <= 0) {
    return {
      tone: 'unknown',
      label: 'Month not started',
      emoji: '🎯',
      detail: 'Performance appears once the first day of the month is recorded.',
      paceVariance: 0,
    }
  }

  const tolerance = expectedToDate * PACE_TOLERANCE

  // A finished month is reported as a result, not as a pace to catch up on.
  const finished = daysRemaining === 0

  if (paceVariance > tolerance) {
    return {
      tone: 'ahead',
      label: finished ? 'Target Beaten' : 'Ahead of Target',
      emoji: finished ? '🎉' : '🔥',
      detail: finished
        ? `The month finished ${currency(paceVariance)} above the target.`
        : `You are ${currency(paceVariance)} ahead of the expected pace for this point in the month.`,
      paceVariance,
    }
  }
  if (paceVariance < -tolerance) {
    const short = currency(Math.abs(paceVariance))
    if (finished) {
      return {
        tone: 'behind',
        label: 'Target Missed',
        emoji: '⚠️',
        detail: `The month finished ${short} below the target.`,
        paceVariance,
      }
    }
    const need =
      requiredDailyPace !== null
        ? ` You need ${currency(requiredDailyPace)} per day over the remaining ${daysRemaining} ${
            daysRemaining === 1 ? 'day' : 'days'
          } to reach the target.`
        : ''
    return {
      tone: 'behind',
      label: 'Behind Target',
      emoji: '⚠️',
      detail: `You are ${short} below the expected pace.${need}`,
      paceVariance,
    }
  }
  return {
    tone: 'on-track',
    label: finished ? 'Target Met' : 'On Track',
    emoji: '🎯',
    detail: finished
      ? 'The month finished in line with the target.'
      : 'Sales are running in line with the monthly target pace.',
    paceVariance,
  }
}

/** Local, dependency-free ₹ formatting so this module stays pure. */
function currency(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value))}`
}

/**
 * Month-to-date metrics, evaluated strictly as of `asOf`.
 *
 * Passing an earlier `asOf` is what makes a historical report correct: a report
 * dated 3 October must never see 4 or 5 October, so the cut happens here in the
 * calculation layer rather than anywhere in the UI.
 */
export function calculateMonthlyMetrics(
  monthKey: string,
  allEntries: DailySales[],
  monthlyTarget: number,
  asOf?: string,
): MonthlyMetrics {
  const daysInMonth = daysInMonthOf(monthKey)
  const today = todayKey()
  const monthEnd = lastDayKey(monthKey)

  // For a past month the whole month has elapsed; for the live month, up to
  // today; for a future month, nothing has.
  const defaultAsOf = today > monthEnd ? monthEnd : today < `${monthKey}-01` ? `${monthKey}-01` : today
  const effectiveAsOf = asOf ?? defaultAsOf

  const entries = allEntries
    .filter((e) => monthKeyOfDay(e.date) === monthKey && e.date <= effectiveAsOf)
    .sort((a, b) => a.date.localeCompare(b.date))

  const daysElapsed =
    today < `${monthKey}-01` ? 0 : Math.min(dayOfMonth(effectiveAsOf), daysInMonth)
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed)
  const daysRecorded = entries.length

  const mtdSales = entries.reduce((sum, e) => sum + totalSalesOf(e), 0)
  const mtdNetSales = entries.reduce((sum, e) => sum + e.netSales, 0)
  const mtdExpenses = entries.reduce((sum, e) => sum + e.expenses, 0)

  const baseDailyTarget = monthlyTarget / daysInMonth
  const expectedToDate = baseDailyTarget * daysElapsed
  const remaining = Math.max(0, monthlyTarget - mtdSales)

  // Averaged over days actually recorded, not calendar days — a missing day is
  // unrecorded, which is not the same as a day with zero sales.
  const averageDailySales = safeDivide(mtdSales, daysRecorded)
  const requiredDailyPace = daysRemaining > 0 ? remaining / daysRemaining : null

  const projection = calculateProjection(averageDailySales, daysInMonth, daysRecorded, monthlyTarget)
  const status = calculatePerformanceStatus(
    mtdSales,
    expectedToDate,
    monthlyTarget,
    requiredDailyPace,
    daysRemaining,
  )

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    asOf: effectiveAsOf,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    daysRecorded,
    monthlyTarget,
    mtdSales,
    mtdNetSales,
    mtdExpenses,
    mtdSalesAfterExpenses: mtdSales - mtdExpenses,
    achievement: monthlyTarget > 0 ? (mtdSales / monthlyTarget) * 100 : null,
    remaining,
    baseDailyTarget,
    expectedToDate,
    averageDailySales,
    requiredDailyPace,
    projection,
    channels: calculateChannelBreakdown(entries),
    food: calculateFoodBreakdown(entries),
    status,
    entries,
  }
}
