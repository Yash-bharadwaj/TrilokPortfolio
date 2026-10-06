import { Link } from 'react-router-dom'
import { CalendarPlusIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatShortDate } from '@/lib/date'

const SHOWN = 4

/**
 * A quiet nudge, not an alarm. A gap matters because the month's average
 * divides by days recorded, so an unnoticed missing day flatters the average
 * and the projection with it.
 */
export function MissingDaysCard({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null

  const shown = missing.slice(-SHOWN).reverse()
  const extra = missing.length - shown.length

  return (
    <Card className="border-amber-300/70 bg-amber-50/70 p-4">
      <div className="flex items-start gap-3">
        <CalendarPlusIcon className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {missing.length === 1 ? '1 day not entered' : `${missing.length} days not entered`}
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            Averages and the month-end estimate skip these days.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {shown.map((date) => (
              <Link
                key={date}
                to={`/add?date=${date}`}
                className="rounded-lg border border-amber-300 bg-card px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
              >
                {formatShortDate(date)}
              </Link>
            ))}
            {extra > 0 && (
              <span className="self-center text-xs text-amber-900/70">+{extra} earlier</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
