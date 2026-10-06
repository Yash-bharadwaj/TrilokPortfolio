import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex h-9 items-center justify-center px-9',
        caption_label: 'text-sm font-semibold',
        nav: 'flex items-center justify-between absolute inset-x-1 top-1 pointer-events-none',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'pointer-events-auto opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'pointer-events-auto opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-10 text-[0.7rem] font-medium text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: 'relative size-10 p-0 text-center text-sm',
        day_button: cn(
          'size-10 rounded-lg font-medium transition-colors hover:bg-secondary',
          'aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary',
          'focus-visible:ring-2 focus-visible:ring-ring outline-none',
        ),
        today: 'font-bold text-primary',
        outside: 'text-muted-foreground/50',
        disabled: 'text-muted-foreground/40 line-through',
        hidden: 'invisible',
        root: 'relative',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="size-4" {...rest} />
          ) : (
            <ChevronRightIcon className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
