import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSales } from '@/providers/sales-provider'
import { currentMonthKey, formatMonthLabel, shiftMonth } from '@/lib/date'

/** ← October 2026 → . Nothing after the current month, because it cannot have sales. */
export function MonthSelector() {
  const { monthKey, setMonthKey } = useSales()
  const atLatest = monthKey >= currentMonthKey()

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
        aria-label={`Previous month, ${formatMonthLabel(shiftMonth(monthKey, -1))}`}
      >
        <ChevronLeftIcon className="size-5" />
      </Button>
      <p className="text-base font-semibold" aria-live="polite">
        {formatMonthLabel(monthKey)}
      </p>
      <Button
        variant="ghost"
        size="icon"
        disabled={atLatest}
        onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
        aria-label={`Next month, ${formatMonthLabel(shiftMonth(monthKey, 1))}`}
      >
        <ChevronRightIcon className="size-5" />
      </Button>
    </div>
  )
}
