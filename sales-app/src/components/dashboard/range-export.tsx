import * as React from 'react'
import { DownloadIcon, LoaderIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DateField } from '@/components/dashboard/date-field'
import { useSales } from '@/providers/sales-provider'
import { buildRangeCsv, downloadCsv, rangeCsvFileName } from '@/lib/csv'
import {
  firstDayKey,
  formatRangeLabel,
  fromDayKey,
  lastDayKey,
  shiftMonth,
  toDayKey,
  todayKey,
} from '@/lib/date'
import { friendlyError } from '@/lib/errors'
import { cn } from '@/lib/utils'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDayKey(d)
}

/** One tap for the ranges anyone actually asks for. */
function presets(): { id: string; label: string; from: string; to: string }[] {
  const today = todayKey()
  const lastMonth = shiftMonth(today.slice(0, 7), -1)
  return [
    { id: '7d', label: 'Last 7 days', from: daysAgo(6), to: today },
    { id: '30d', label: 'Last 30 days', from: daysAgo(29), to: today },
    { id: 'month', label: 'This month', from: firstDayKey(today.slice(0, 7)), to: today },
    {
      id: 'last-month',
      label: 'Last month',
      from: firstDayKey(lastMonth),
      to: lastDayKey(lastMonth),
    },
  ]
}

/** Any stretch of days, including one that crosses from one month into the next. */
export function RangeExport() {
  const { fetchRange } = useSales()
  const options = React.useMemo(presets, [])
  const [from, setFrom] = React.useState(() => options[2]!.from)
  const [to, setTo] = React.useState(todayKey)
  const [busy, setBusy] = React.useState(false)

  const dayCount =
    Math.round((fromDayKey(to).getTime() - fromDayKey(from).getTime()) / 86_400_000) + 1
  const activePreset = options.find((p) => p.from === from && p.to === to)

  async function handleDownload() {
    if (busy) return
    setBusy(true)
    try {
      const { entries, monthlyTargets } = await fetchRange(from, to)
      if (entries.length === 0) {
        toast.error(`No sales recorded between ${formatRangeLabel(from, to)}.`)
        return
      }
      downloadCsv(buildRangeCsv(entries, monthlyTargets, from, to), rangeCsvFileName(from, to))
      toast.success(`${entries.length} ${entries.length === 1 ? 'day' : 'days'} downloaded.`)
    } catch (error) {
      toast.error(friendlyError(error, 'Could not build the spreadsheet. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date ranges">
        {options.map((preset) => {
          const active = activePreset?.id === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setFrom(preset.from)
                setTo(preset.to)
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-secondary',
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="range-from">From</Label>
          {/* Capped at `to`, so the range can never be back to front. */}
          <DateField id="range-from" value={from} onChange={setFrom} max={to} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="range-to">To</Label>
          <DateField id="range-to" value={to} onChange={setTo} min={from} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {formatRangeLabel(from, to)} · {dayCount} {dayCount === 1 ? 'day' : 'days'}
      </p>

      <Button variant="outline" className="w-full" onClick={handleDownload} disabled={busy}>
        {busy ? <LoaderIcon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
        {busy ? 'Preparing…' : 'Download these dates (CSV)'}
      </Button>
    </div>
  )
}
