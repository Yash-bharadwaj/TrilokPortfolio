import { cn } from '@/lib/utils'
import { formatCurrency, formatPercent } from '@/lib/format'

export interface MeterSlice {
  key: string
  label: string
  value: number
  share: number
  color: string
}

/**
 * A part-to-whole meter with every slice named, costed and given its percentage.
 * Chosen over a donut because on a 360px screen a labelled bar is read instantly
 * and colour is never the only thing carrying identity.
 */
export function ShareMeter({
  slices,
  total,
  emptyMessage,
}: {
  slices: MeterSlice[]
  total: number
  emptyMessage: string
}) {
  const visible = slices.filter((s) => s.value > 0)

  if (total <= 0 || visible.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="space-y-3">
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={visible
          .map((s) => `${s.label} ${formatPercent(s.share)}`)
          .join(', ')}
      >
        {visible.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${Math.max(1, s.share)}%`, backgroundColor: s.color }}
          />
        ))}
      </div>

      <ul className="space-y-2">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
            <span className="tnum text-sm font-semibold">{formatCurrency(s.value)}</span>
            <span className={cn('tnum w-14 text-right text-sm text-muted-foreground')}>
              {formatPercent(s.share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
