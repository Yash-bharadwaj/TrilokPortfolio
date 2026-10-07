import { z } from 'zod'
import { todayKey } from '@/lib/date'
import { formatCurrency } from '@/lib/format'
import { ENTRY_MODE, SALES_MODEL } from '@/calculations/config'

const MAX_AMOUNT = 100_000_000 // ₹10 crore in a single day is a typo, not a sale.

const amount = (label: string) =>
  z
    .number({
      required_error: `Please enter a valid ${label} amount.`,
      invalid_type_error: `Please enter a valid ${label} amount.`,
    })
    .min(0, `${label} cannot be negative.`)
    .max(MAX_AMOUNT, `${label} looks too large. Please check the amount.`)
    .finite(`Please enter a valid ${label} amount.`)

const optionalAmount = (label: string) =>
  z
    .union([amount(label), z.null(), z.undefined()])
    .transform((v) => v ?? 0)

/** Hard validation only — anything that must never reach the database. */
export const dailySalesSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a valid date.')
    .refine((d) => d <= todayKey(), 'You cannot record sales for a future date.'),
  netSales: amount('Net Sales'),
  swiggySales: optionalAmount('Swiggy'),
  zomatoSales: optionalAmount('Zomato'),
  vegSales: optionalAmount('Veg Sales'),
  nonVegSales: optionalAmount('Non-Veg Sales'),
  expenses: optionalAmount('Expenses'),
  note: z.string().max(200, 'Please keep the note under 200 characters.').optional(),
})

export type DailySalesInput = z.input<typeof dailySalesSchema>
export type DailySalesValues = z.output<typeof dailySalesSchema>

export const monthlyTargetSchema = z.object({
  monthlyTarget: z
    .number({
      required_error: 'Please enter a monthly target.',
      invalid_type_error: 'Please enter a monthly target.',
    })
    .min(0, 'The monthly target cannot be negative.')
    .max(MAX_AMOUNT, 'That target looks too large. Please check the amount.'),
})

export type MonthlyTargetValues = z.infer<typeof monthlyTargetSchema>

export interface SoftWarning {
  id: string
  message: string
  level: 'warning' | 'info'
}

/**
 * Soft and informational checks. These surface likely mistakes but never block
 * saving, because the hotel may legitimately record categories we cannot model.
 */
export interface DayContext {
  /** The running total standing at the end of the previous recorded day. */
  previousCumulativeTotal: number
}

export function collectSoftWarnings(
  values: {
    netSales: number | null
    swiggySales: number | null
    zomatoSales: number | null
    vegSales: number | null
    nonVegSales: number | null
    expenses: number | null
  },
  context?: DayContext,
): SoftWarning[] {
  const net = values.netSales ?? 0
  const swiggy = values.swiggySales ?? 0
  const zomato = values.zomatoSales ?? 0
  const veg = values.vegSales ?? 0
  const nonVeg = values.nonVegSales ?? 0
  const expenses = values.expenses ?? 0
  const warnings: SoftWarning[] = []

  const dayTotal = SALES_MODEL === 'net-includes-online' ? net : net + swiggy + zomato

  if (SALES_MODEL === 'net-includes-online' && net > 0 && swiggy + zomato > net) {
    warnings.push({
      id: 'online-exceeds-net',
      level: 'warning',
      message: `Swiggy + Zomato (${formatCurrency(swiggy + zomato)}) are higher than Net Sales (${formatCurrency(
        net,
      )}). Net Sales should include online orders. Please verify.`,
    })
  }

  const food = veg + nonVeg
  if (food > 0 && dayTotal > 0) {
    const diff = food - dayTotal
    const tolerance = dayTotal * 0.05
    if (diff > tolerance) {
      warnings.push({
        id: 'food-above-total',
        level: 'warning',
        message: `Veg + Non-Veg sales are ${formatCurrency(diff)} higher than the day total. Please verify.`,
      })
    } else if (-diff > tolerance) {
      warnings.push({
        id: 'food-below-total',
        level: 'info',
        message: `Veg + Non-Veg cover ${formatCurrency(food)} of the ${formatCurrency(
          dayTotal,
        )} day total. The remainder is not itemised.`,
      })
    }
  }

  if (expenses > 0 && dayTotal > 0 && expenses > dayTotal) {
    warnings.push({
      id: 'expenses-exceed-sales',
      level: 'warning',
      message: `Expenses (${formatCurrency(expenses)}) exceed the day's sales. Please verify.`,
    })
  }

  /*
   * A running total can only ever grow. A line below the one before it means a
   * figure was mistyped, and would otherwise read as a day of zero sales.
   */
  if (
    ENTRY_MODE === 'cumulative' &&
    context &&
    context.previousCumulativeTotal > 0 &&
    dayTotal > 0 &&
    dayTotal < context.previousCumulativeTotal
  ) {
    warnings.push({
      id: 'below-previous',
      level: 'warning',
      message: `The month already stood at ${formatCurrency(
        context.previousCumulativeTotal,
      )} up to the day before, so a running total cannot be ${formatCurrency(
        dayTotal,
      )}. Please check the figures.`,
    })
  }

  if (net === 0 && swiggy === 0 && zomato === 0) {
    warnings.push({
      id: 'zero-day',
      level: 'info',
      message: 'This will be recorded as a zero-sales day.',
    })
  }

  return warnings
}
