import type { DailyMetrics, Insight, MonthlyMetrics } from '@/types'
import { formatCurrency, formatPercent } from '@/lib/format'
import { formatShortDate } from '@/lib/date'
import { totalSalesOf } from './config'

/**
 * Insights are plain arithmetic on recorded figures — never speculation.
 * Anything that cannot be computed from the data is simply not shown.
 */
export function generateInsights(daily: DailyMetrics, monthly: MonthlyMetrics): Insight[] {
  const out: Insight[] = []
  const push = (id: string, text: string, tone: Insight['tone'] = 'neutral') =>
    out.push({ id, text, tone })

  const hasDay = daily.entry !== null

  // --- the day against its own target -------------------------------------
  if (hasDay && monthly.monthlyTarget > 0) {
    const v = daily.variance
    if (Math.abs(Math.round(v)) === 0) {
      push('daily-variance', 'Today landed exactly on the daily target.', 'neutral')
    } else if (v > 0) {
      push('daily-variance', `Today's sales are ${formatCurrency(v)} above the daily target.`, 'positive')
    } else {
      push('daily-variance', `Today's sales are ${formatCurrency(-v)} below the daily target.`, 'negative')
    }
  }

  // --- channel contribution ------------------------------------------------
  if (hasDay && daily.totalSales > 0) {
    const { swiggyShare, zomatoShare, swiggy, zomato } = daily.channels
    if (swiggy > 0) {
      push('swiggy-share', `Swiggy contributed ${formatPercent(swiggyShare)} of today's sales.`)
    }
    if (zomato > 0) {
      push('zomato-share', `Zomato contributed ${formatPercent(zomatoShare)} of today's sales.`)
    }
    const online = swiggyShare + zomatoShare
    if (online > 0) {
      push(
        'online-share',
        `Online aggregators made up ${formatPercent(online)} of today's sales; the rest was direct.`,
        online > 35 ? 'negative' : 'neutral',
      )
    }
  }

  // --- day-on-day movement -------------------------------------------------
  const index = monthly.entries.findIndex((e) => e.date === daily.date)
  const previous = index > 0 ? monthly.entries[index - 1] : undefined
  if (hasDay && previous) {
    const prevTotal = totalSalesOf(previous)
    const delta = daily.totalSales - prevTotal
    if (prevTotal > 0 && Math.round(Math.abs(delta)) > 0) {
      const pct = (delta / prevTotal) * 100
      push(
        'dod',
        delta > 0
          ? `Sales rose ${formatCurrency(delta)} (${formatPercent(pct)}) against ${formatShortDate(previous.date)}.`
          : `Sales fell ${formatCurrency(-delta)} (${formatPercent(-pct)}) against ${formatShortDate(previous.date)}.`,
        delta > 0 ? 'positive' : 'negative',
      )
    }
    if (previous.zomatoSales > 0 || daily.channels.zomato > 0) {
      const zd = daily.channels.zomato - previous.zomatoSales
      if (Math.round(Math.abs(zd)) > 0) {
        push(
          'zomato-dod',
          zd > 0
            ? `Zomato sales increased ${formatCurrency(zd)} compared with the previous recorded day.`
            : `Zomato sales decreased ${formatCurrency(-zd)} compared with the previous recorded day.`,
          zd > 0 ? 'positive' : 'negative',
        )
      }
    }
  }

  // --- monthly pace --------------------------------------------------------
  if (monthly.monthlyTarget > 0 && monthly.expectedToDate > 0) {
    const pct = (monthly.status.paceVariance / monthly.expectedToDate) * 100
    if (monthly.status.tone === 'ahead') {
      push('pace', `You are ${formatPercent(pct)} ahead of the expected monthly pace.`, 'positive')
    } else if (monthly.status.tone === 'behind') {
      push('pace', `You are ${formatPercent(-pct)} behind the expected monthly pace.`, 'negative')
    } else {
      push('pace', 'Month-to-date sales are tracking the monthly target pace.', 'neutral')
    }
  }

  // --- average vs required pace -------------------------------------------
  if (monthly.averageDailySales !== null && monthly.requiredDailyPace !== null) {
    const gap = monthly.averageDailySales - monthly.requiredDailyPace
    if (Math.round(Math.abs(gap)) > 0) {
      push(
        'pace-gap',
        gap > 0
          ? `Average daily sales are ${formatCurrency(gap)} above the pace still required.`
          : `Average daily sales need to rise by ${formatCurrency(-gap)} to hit the monthly target.`,
        gap > 0 ? 'positive' : 'negative',
      )
    }
  }

  // --- food mix ------------------------------------------------------------
  const food = hasDay && daily.food.recorded ? daily.food : monthly.food.recorded ? monthly.food : null
  if (food) {
    const scope = hasDay && daily.food.recorded ? 'today' : 'this month'
    push(
      'food-mix',
      `Non-Veg contributed ${formatPercent(food.nonVegShare)} and Veg ${formatPercent(
        food.vegShare,
      )} of itemised food sales ${scope}.`,
    )
  }

  // --- best day ------------------------------------------------------------
  if (monthly.entries.length >= 3) {
    const best = monthly.entries.reduce((a, b) => (totalSalesOf(b) > totalSalesOf(a) ? b : a))
    push(
      'best-day',
      `Best day so far is ${formatShortDate(best.date)} at ${formatCurrency(totalSalesOf(best))}.`,
      'positive',
    )
  }

  // --- expenses ------------------------------------------------------------
  if (monthly.mtdExpenses > 0 && monthly.mtdSales > 0) {
    const ratio = (monthly.mtdExpenses / monthly.mtdSales) * 100
    push(
      'expense-ratio',
      `Expenses are ${formatPercent(ratio)} of month-to-date sales, leaving ${formatCurrency(
        monthly.mtdSalesAfterExpenses,
      )} after expenses.`,
      ratio > 40 ? 'negative' : 'neutral',
    )
  }

  // --- projection ----------------------------------------------------------
  if (monthly.projection.projected !== null && monthly.projection.varianceToTarget !== null) {
    const v = monthly.projection.varianceToTarget
    const hedge = monthly.projection.lowConfidence ? ' (early estimate from limited data)' : ''
    push(
      'projection',
      v >= 0
        ? `At the current average, the month is projected to beat the target by ${formatCurrency(v)}${hedge}.`
        : `At the current average, the month is projected to fall short by ${formatCurrency(-v)}${hedge}.`,
      v >= 0 ? 'positive' : 'negative',
    )
  }

  return out
}

/** The handful worth putting on a shared report image. */
export function topInsights(insights: Insight[], limit = 3): Insight[] {
  const weight = (i: Insight) => (i.tone === 'negative' ? 0 : i.tone === 'positive' ? 1 : 2)
  return [...insights].sort((a, b) => weight(a) - weight(b)).slice(0, limit)
}
