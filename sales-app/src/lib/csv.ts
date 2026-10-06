import type { MonthlyMetrics } from '@/types'
import { DIRECT_LABEL, directSalesOf, totalSalesOf, HOTEL } from '@/calculations/config'
import { formatShortDate, formatMonthLabel } from '@/lib/date'

/**
 * A spreadsheet of the month, for whoever does the books.
 *
 * Values are written as plain numbers with no ₹ or thousands separators, so
 * Excel reads them as numbers rather than text. A totals row closes the sheet.
 */
export function buildMonthCsv(monthly: MonthlyMetrics): string {
  const header = [
    'Date',
    'Day',
    'Total Sales',
    DIRECT_LABEL,
    'Swiggy',
    'Zomato',
    'Veg',
    'Non-Veg',
    'Expenses',
    'Sales After Expenses',
    'Daily Target',
    'vs Target',
    'Note',
  ]

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

  const rows = monthly.entries.map((entry) => {
    const total = totalSalesOf(entry)
    return [
      entry.date,
      formatShortDate(entry.date),
      String(total),
      String(Math.max(0, directSalesOf(entry))),
      String(entry.swiggySales),
      String(entry.zomatoSales),
      String(entry.vegSales),
      String(entry.nonVegSales),
      String(entry.expenses),
      String(total - entry.expenses),
      monthly.baseDailyTarget.toFixed(2),
      (total - monthly.baseDailyTarget).toFixed(2),
      escape(entry.note ?? ''),
    ].join(',')
  })

  const totals = [
    'TOTAL',
    `${monthly.daysRecorded} days`,
    String(monthly.mtdSales),
    String(monthly.channels.direct),
    String(monthly.channels.swiggy),
    String(monthly.channels.zomato),
    String(monthly.food.veg),
    String(monthly.food.nonVeg),
    String(monthly.mtdExpenses),
    String(monthly.mtdSalesAfterExpenses),
    String(monthly.monthlyTarget),
    (monthly.mtdSales - monthly.monthlyTarget).toFixed(2),
    '',
  ].join(',')

  return [
    `${HOTEL.name} — ${formatMonthLabel(monthly.monthKey)} sales`,
    '',
    header.join(','),
    ...rows,
    '',
    totals,
  ].join('\n')
}

export function monthCsvFileName(monthKey: string): string {
  return `${HOTEL.name.replace(/\s+/g, '-')}-${formatMonthLabel(monthKey).replace(/\s+/g, '-')}.csv`
}

export function downloadCsv(contents: string, fileName: string) {
  // The BOM makes Excel open UTF-8 correctly, which matters for the ₹ in the title.
  const blob = new Blob([`﻿${contents}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
