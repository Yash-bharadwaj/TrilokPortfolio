import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatLongDate, fromDayKey, toDayKey, todayKey } from '@/lib/date'
import { cn } from '@/lib/utils'

/** A tap opens a real calendar — no typing, no format to get wrong. */
export function DateField({
  value,
  onChange,
  id,
  min,
  max,
}: {
  value: string
  onChange: (next: string) => void
  id?: string
  /** Earliest selectable day. */
  min?: string
  /** Latest selectable day. Never later than today. */
  max?: string
}) {
  const [open, setOpen] = React.useState(false)
  const isToday = value === todayKey()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn('h-14 w-full justify-start gap-3 px-4 text-base font-semibold')}
        >
          <CalendarIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{formatLongDate(value)}</span>
          {isToday && (
            <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Today
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          autoFocus
          selected={fromDayKey(value)}
          defaultMonth={fromDayKey(value)}
          // Out-of-range days are simply unpickable, so an invalid range cannot
          // be produced in the first place.
          disabled={[
            { after: max ? fromDayKey(max) : new Date() },
            ...(min ? [{ before: fromDayKey(min) }] : []),
          ]}
          onSelect={(date) => {
            if (!date) return
            onChange(toDayKey(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
