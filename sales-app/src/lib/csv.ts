import type { DailySales, MonthlyMetrics } from '@/types'
import { DIRECT_LABEL, directSalesOf, totalSalesOf, HOTEL } from '@/calculations/config'
import {
  daysInMonthOf,
  formatMonthLabel,
  formatRangeLabel,
  formatShortDate,
  monthKeyOfDay,
} from '@/lib/date'

/**
 * A spreadsheet of the month, for whoever does the books.
 *
 * Values are written as plain numbers with no ₹ or thousands separators, so
 * Excel reads them as numbers rather than text. A totals row closes the sheet.
 */
const HEADER = [
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

function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function row(entry: DailySales, dailyTarget: number): string {
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
    dailyTarget > 0 ? dailyTarget.toFixed(2) : '',
    dailyTarget > 0 ? (total - dailyTarget).toFixed(2) : '',
    escape(entry.note ?? ''),
  ].join(',')
}

function sum(entries: DailySales[], pick: (e: DailySales) => number): number {
  return entries.reduce((acc, e) => acc + pick(e), 0)
}

/**
 * Shared sheet builder. Values are plain numbers with no ₹ or separators, so
 * Excel reads them as numbers rather than text, and a totals row closes it.
 */
function buildCsv(
  title: string,
  entries: DailySales[],
  dailyTargetFor: (entry: DailySales) => number,
  targetTotal: number | null,
): string {
  const rows = entries.map((entry) => row(entry, dailyTargetFor(entry)))
  const grandTotal = sum(entries, totalSalesOf)
  const expenses = sum(entries, (e) => e.expenses)

  const totals = [
    'TOTAL',
    `${entries.length} ${entries.length === 1 ? 'day' : 'days'}`,
    String(grandTotal),
    String(sum(entries, (e) => Math.max(0, directSalesOf(e)))),
    String(sum(entries, (e) => e.swiggySales)),
    String(sum(entries, (e) => e.zomatoSales)),
    String(sum(entries, (e) => e.vegSales)),
    String(sum(entries, (e) => e.nonVegSales)),
    String(expenses),
    String(grandTotal - expenses),
    targetTotal === null ? '' : String(targetTotal),
    targetTotal === null ? '' : (grandTotal - targetTotal).toFixed(2),
    '',
  ].join(',')

  return [title, '', HEADER.join(','), ...rows, '', totals].join('\n')
}

export function buildMonthCsv(monthly: MonthlyMetrics): string {
  return buildCsv(
    `${HOTEL.name} — ${formatMonthLabel(monthly.monthKey)} sales`,
    monthly.entries,
    () => monthly.baseDailyTarget,
    monthly.monthlyTarget,
  )
}

/**
 * A range that may cross month boundaries, so each day is measured against the
 * target of its own month rather than one blanket figure.
 */
export function buildRangeCsv(
  entries: DailySales[],
  monthlyTargets: Record<string, number>,
  from: string,
  to: string,
): string {
  const dailyTargetFor = (entry: DailySales) => {
    const monthKey = monthKeyOfDay(entry.date)
    const target = monthlyTargets[monthKey] ?? 0
    return target > 0 ? target / daysInMonthOf(monthKey) : 0
  }
  return buildCsv(
    `${HOTEL.name} — sales ${formatRangeLabel(from, to)}`,
    entries,
    dailyTargetFor,
    null,
  )
}

export function rangeCsvFileName(from: string, to: string): string {
  return `${HOTEL.name.replace(/\s+/g, '-')}-Sales-${from}_to_${to}.csv`
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
