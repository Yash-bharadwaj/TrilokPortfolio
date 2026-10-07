import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DIRECT_LABEL, directSalesOf, totalSalesOf } from '@/calculations/config'
import { formatCompactPercent, formatCurrency } from '@/lib/format'
import { fromDayKey } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { DailySales, MonthlyMetrics } from '@/types'

interface Row {
  date: string
  label: string
  sale: number
  direct: number
  swiggy: number
  zomato: number
  target: number
  achievement: number | null
  expenses: number
}

const column = createColumnHelper<Row>()

/** Right-aligned money, matching the sheet. */
function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn('tnum', className)}>{formatCurrency(value)}</span>
}

/**
 * The month laid out the way the hotel's own sheet is: one row per day, one
 * column per figure. It sits above the chart because the staff read numbers,
 * not bars.
 *
 * Built on TanStack Table so the columns are declared once and sorting comes
 * from the library. The table scrolls sideways inside its own card — the page
 * never does — and the date column stays put so a row is never read against
 * the wrong day.
 */
export function DailyTable({ monthly }: { monthly: MonthlyMetrics }) {
  const target = monthly.baseDailyTarget
  const hasTarget = target > 0
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: false }])

  const data = React.useMemo<Row[]>(
    () =>
      monthly.entries.map((entry: DailySales) => {
        const sale = totalSalesOf(entry)
        return {
          date: entry.date,
          label: format(fromDayKey(entry.date), 'dd EEE'),
          sale,
          direct: Math.max(0, directSalesOf(entry)),
          swiggy: entry.swiggySales,
          zomato: entry.zomatoSales,
          target,
          achievement: hasTarget ? (sale / target) * 100 : null,
          expenses: entry.expenses,
        }
      }),
    [monthly.entries, target, hasTarget],
  )

  const columns = React.useMemo(
    () => [
      column.accessor('date', {
        header: 'Day',
        cell: (c) => c.row.original.label,
      }),
      column.accessor('sale', {
        header: 'Sale',
        cell: (c) => <Money value={c.getValue()} className="font-bold" />,
      }),
      column.accessor('direct', {
        header: DIRECT_LABEL,
        cell: (c) => <Money value={c.getValue()} />,
      }),
      column.accessor('swiggy', { header: 'Swiggy', cell: (c) => <Money value={c.getValue()} /> }),
      column.accessor('zomato', { header: 'Zomato', cell: (c) => <Money value={c.getValue()} /> }),
      ...(hasTarget
        ? [
            column.accessor('target', {
              header: 'Target',
              cell: (c) => <Money value={c.getValue()} className="text-muted-foreground" />,
            }),
            column.accessor('achievement', {
              header: '%',
              cell: (c) => {
                const v = c.getValue()
                return (
                  <span
                    className={cn(
                      'tnum font-semibold',
                      (v ?? 0) >= 100 ? 'text-leaf-600' : 'text-brand-600',
                    )}
                  >
                    {formatCompactPercent(v)}
                  </span>
                )
              },
            }),
          ]
        : []),
      column.accessor('expenses', {
        header: 'Expenses',
        cell: (c) => <Money value={c.getValue()} className="text-muted-foreground" />,
      }),
    ],
    [hasTarget],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.date,
  })

  if (data.length === 0) return null

  const totals = data.reduce(
    (a, r) => ({
      sale: a.sale + r.sale,
      direct: a.direct + r.direct,
      swiggy: a.swiggy + r.swiggy,
      zomato: a.zomato + r.zomato,
      expenses: a.expenses + r.expenses,
    }),
    { sale: 0, direct: 0, swiggy: 0, zomato: 0, expenses: 0 },
  )
  const targetToDate = target * data.length

  // The first column stays pinned while the rest scrolls.
  const pinned = 'sticky left-0 z-10'

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Sales each day</CardTitle>
        <CardDescription>
          Scroll sideways for every column. Tap a heading to sort.
        </CardDescription>
      </CardHeader>

      <div
        className="no-scrollbar overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Daily sales table, scrollable sideways"
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="border-y border-border bg-secondary/70">
                {group.headers.map((header, i) => {
                  const sorted = header.column.getIsSorted()
                  const Icon =
                    sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ChevronsUpDownIcon
                  return (
                    <TableHead
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                      className={cn(
                        'bg-secondary',
                        i === 0 ? cn(pinned, 'pl-3') : 'text-right',
                        i === table.getAllColumns().length - 1 && 'pr-4',
                      )}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold',
                          i === 0 ? '' : 'flex-row-reverse',
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <Icon
                          className={cn('size-3 shrink-0', sorted ? 'opacity-90' : 'opacity-35')}
                          aria-hidden
                        />
                      </button>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell, i) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'text-xs',
                      i === 0
                        ? cn(pinned, 'bg-card pl-3 text-left font-semibold')
                        : 'text-right',
                      i === row.getVisibleCells().length - 1 && 'pr-4',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow className="bg-secondary/70">
              <TableCell className={cn(pinned, 'bg-secondary pl-3 text-left text-xs')}>
                {data.length} {data.length === 1 ? 'day' : 'days'}
              </TableCell>
              <TableCell className="text-right text-xs">
                <Money value={totals.sale} />
              </TableCell>
              <TableCell className="text-right text-xs">
                <Money value={totals.direct} />
              </TableCell>
              <TableCell className="text-right text-xs">
                <Money value={totals.swiggy} />
              </TableCell>
              <TableCell className="text-right text-xs">
                <Money value={totals.zomato} />
              </TableCell>
              {hasTarget && (
                <TableCell className="text-right text-xs">
                  <Money value={targetToDate} />
                </TableCell>
              )}
              {hasTarget && (
                <TableCell
                  className={cn(
                    'tnum text-right text-xs',
                    totals.sale >= targetToDate ? 'text-leaf-600' : 'text-brand-600',
                  )}
                >
                  {formatCompactPercent((totals.sale / targetToDate) * 100)}
                </TableCell>
              )}
              <TableCell className="pr-4 text-right text-xs">
                <Money value={totals.expenses} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Card>
  )
}
