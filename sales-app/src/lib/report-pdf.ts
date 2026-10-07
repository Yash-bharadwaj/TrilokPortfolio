import { format } from 'date-fns'
import { DIRECT_LABEL, HOTEL, REPORT_SIGNATURE, directSalesOf, totalSalesOf } from '@/calculations/config'
import { formatCompactPercent, formatNumber, formatPercent } from '@/lib/format'
import { fromDayKey } from '@/lib/date'
import type { MonthlyMetrics } from '@/types'

const PAGE = { width: 210, margin: 14 } // A4 portrait, millimetres
const CONTENT = PAGE.width - PAGE.margin * 2

const RGB = {
  brand: [143, 29, 44] as [number, number, number],
  ink: [26, 22, 20] as [number, number, number],
  soft: [59, 50, 45] as [number, number, number],
  muted: [141, 131, 124] as [number, number, number],
  rule: [234, 227, 218] as [number, number, number],
  panel: [250, 247, 243] as [number, number, number],
  good: [13, 107, 61] as [number, number, number],
  bad: [164, 22, 46] as [number, number, number],
}

/**
 * Amounts are written as plain grouped numbers with the currency stated once in
 * the header. jsPDF's built-in fonts have no ₹ glyph, and embedding a licensed
 * one is not an option — stating the unit once is the ordinary convention in
 * financial reporting anyway, and it keeps eight columns inside an A4 page.
 */
const amount = (v: number) => formatNumber(Math.round(v))

/**
 * jsPDF's built-in fonts are WinAnsi, which has no ₹ (U+20B9) and no proper
 * minus (U+2212) — both come out as stray letters. Sentences built by the
 * calculation engine carry those characters, so everything drawn as text is
 * put through here first.
 */
function plain(text: string): string {
  return text
    .replace(/₹\s?/g, 'INR ')
    .replace(/−/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[’']/g, "'")
    .replace(/[“”]/g, '"')
}

export function monthPdfFileName(monthLabel: string): string {
  return `${HOTEL.name.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}-Report.pdf`
}

/**
 * A full month as a paginated A4 document. The table is laid out by
 * jspdf-autotable, so twenty rows or thirty-one both break correctly, the
 * column headings repeat on every page, and the footer is stamped on each.
 */
export async function buildMonthPdf(monthly: MonthlyMetrics, logoDataUrl?: string): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const generatedAt = new Date()
  const hasTarget = monthly.monthlyTarget > 0
  const target = monthly.baseDailyTarget
  const rows = monthly.entries

  // --- masthead -----------------------------------------------------------
  doc.setFillColor(...RGB.brand)
  doc.rect(0, 0, PAGE.width, 3, 'F')

  let y = PAGE.margin + 4
  if (logoDataUrl) {
    // The wordmark is 805×212, so the height follows from a 46mm width.
    try {
      doc.addImage(logoDataUrl, 'PNG', PAGE.margin, y - 2, 46, 12.1)
    } catch {
      /* a missing logo must not stop the report */
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...RGB.ink)
  doc.text('MONTH SALES REPORT', PAGE.width - PAGE.margin, y + 2, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...RGB.muted)
  doc.text(monthly.monthLabel, PAGE.width - PAGE.margin, y + 7.5, { align: 'right' })
  doc.text('Amounts in INR', PAGE.width - PAGE.margin, y + 12, { align: 'right' })

  y += 18
  doc.setDrawColor(...RGB.rule)
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y)
  y += 7

  // --- headline -----------------------------------------------------------
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...RGB.muted)
  doc.text(monthly.daysRemaining > 0 ? 'SALES SO FAR' : 'TOTAL SALES', PAGE.margin, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...RGB.ink)
  doc.text(amount(monthly.mtdSales), PAGE.margin, y + 10)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...RGB.muted)
  doc.text(
    `Day ${monthly.daysElapsed} of ${monthly.daysInMonth}  ·  ${rows.length} recorded`,
    PAGE.width - PAGE.margin,
    y + 10,
    { align: 'right' },
  )
  y += 16

  // --- the six figures ----------------------------------------------------
  const boxes: [string, string][] = [
    ['Monthly target', hasTarget ? amount(monthly.monthlyTarget) : '-'],
    ['Achievement', hasTarget ? formatPercent(monthly.achievement) : '—'],
    ['Remaining', hasTarget ? amount(monthly.remaining) : '-'],
    ['Average / day', monthly.averageDailySales === null ? '-' : amount(monthly.averageDailySales)],
    ['Needed / day', monthly.requiredDailyPace === null ? '-' : amount(monthly.requiredDailyPace)],
    [
      monthly.daysRemaining === 0 ? 'Finished at' : 'Projected end',
      monthly.projection.projected === null
        ? amount(monthly.mtdSales)
        : amount(monthly.daysRemaining === 0 ? monthly.mtdSales : monthly.projection.projected),
    ],
  ]

  const boxW = CONTENT / 3
  const boxH = 15
  doc.setFillColor(...RGB.panel)
  doc.setDrawColor(...RGB.rule)
  doc.roundedRect(PAGE.margin, y, CONTENT, boxH * 2, 2, 2, 'FD')
  boxes.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = PAGE.margin + col * boxW + 4
    const by = y + row * boxH
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...RGB.muted)
    doc.text(label.toUpperCase(), x, by + 5.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...RGB.ink)
    doc.text(value, x, by + 11.5)
  })
  y += boxH * 2 + 8

  // --- day by day ---------------------------------------------------------
  const head = ['Day', 'Sale', DIRECT_LABEL, 'Swiggy', 'Zomato']
  if (hasTarget) head.push('Target', '%')
  head.push('Expenses')

  const body = rows.map((entry) => {
    const sale = totalSalesOf(entry)
    const line: string[] = [
      format(fromDayKey(entry.date), 'dd EEE'),
      amount(sale),
      amount(Math.max(0, directSalesOf(entry))),
      amount(entry.swiggySales),
      amount(entry.zomatoSales),
    ]
    if (hasTarget) line.push(amount(target), plain(formatCompactPercent((sale / target) * 100)))
    line.push(amount(entry.expenses))
    return line
  })

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
  const foot = [`${rows.length} ${rows.length === 1 ? 'day' : 'days'}`, amount(totals.sale), amount(totals.direct), amount(totals.swiggy), amount(totals.zomato)]
  if (hasTarget) foot.push(amount(targetToDate), plain(formatCompactPercent((totals.sale / targetToDate) * 100)))
  foot.push(amount(totals.expenses))

  // The percentage column is tinted per row, which autoTable does through a hook.
  const pctIndex = hasTarget ? 6 : -1

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    foot: [foot],
    margin: { left: PAGE.margin, right: PAGE.margin, bottom: 18 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: RGB.rule, lineWidth: 0.1, textColor: RGB.soft },
    headStyles: { fillColor: RGB.panel, textColor: RGB.muted, fontStyle: 'bold', fontSize: 7.5, halign: 'right' },
    footStyles: { fillColor: RGB.panel, textColor: RGB.ink, fontStyle: 'bold', fontSize: 8, halign: 'right' },
    bodyStyles: { halign: 'right' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', textColor: RGB.ink, cellWidth: 18 },
      1: { fontStyle: 'bold', textColor: RGB.ink },
    },
    alternateRowStyles: { fillColor: [252, 250, 248] },
    // Repeating the heading on every page is what makes a long month readable.
    showHead: 'everyPage',
    // The totals belong at the end of the month, not at the foot of every page.
    showFoot: 'lastPage',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === pctIndex) {
        const value = Number(String(data.cell.raw).replace('%', '').replace('−', '-'))
        data.cell.styles.textColor = value >= 100 ? RGB.good : RGB.bad
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.section === 'head') data.cell.styles.halign = data.column.index === 0 ? 'left' : 'right'
      if (data.section === 'foot') data.cell.styles.halign = data.column.index === 0 ? 'left' : 'right'
    },
  })

  // --- closing notes, on whatever page the table ended -------------------
  const after = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  let ny = (after?.finalY ?? y) + 7
  if (ny > 250) {
    doc.addPage()
    ny = PAGE.margin + 6
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...RGB.ink)
  doc.text(plain(monthly.status.label), PAGE.margin, ny)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...RGB.soft)
  doc.text(doc.splitTextToSize(plain(monthly.status.detail), CONTENT), PAGE.margin, ny + 5)

  ny += 14
  const c = monthly.channels
  doc.setFontSize(8.5)
  doc.setTextColor(...RGB.muted)
  doc.text(
    `${DIRECT_LABEL} ${amount(c.direct)} (${formatPercent(c.directShare)})   ` +
      `Swiggy ${amount(c.swiggy)} (${formatPercent(c.swiggyShare)})   ` +
      `Zomato ${amount(c.zomato)} (${formatPercent(c.zomatoShare)})`,
    PAGE.margin,
    ny,
  )
  doc.text(
    `Expenses ${amount(monthly.mtdExpenses)}   Sales after expenses ${amount(monthly.mtdSalesAfterExpenses)}`,
    PAGE.margin,
    ny + 5,
  )

  // --- footer on every page ----------------------------------------------
  const stamp = format(generatedAt, "d MMM yyyy, h:mm a")
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p)
    const h = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...RGB.rule)
    doc.line(PAGE.margin, h - 13, PAGE.width - PAGE.margin, h - 13)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...RGB.ink)
    doc.text(HOTEL.name.toUpperCase(), PAGE.margin, h - 8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...RGB.muted)
    doc.text(`${HOTEL.city}  ·  ${HOTEL.phone}`, PAGE.margin, h - 5)
    doc.text(
      `Generated & curated by ${REPORT_SIGNATURE.name}, ${REPORT_SIGNATURE.role}  ·  ${stamp}`,
      PAGE.width - PAGE.margin,
      h - 8.5,
      { align: 'right' },
    )
    doc.text(`Page ${p} of ${pages}`, PAGE.width - PAGE.margin, h - 5, { align: 'right' })
  }

  return doc.output('blob')
}
