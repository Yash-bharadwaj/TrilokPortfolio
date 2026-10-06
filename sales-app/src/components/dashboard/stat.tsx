import type * as React from 'react'
import { cn } from '@/lib/utils'

/** One label, one number. Used everywhere so figures always line up. */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'default' | 'positive' | 'negative' | 'muted'
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          'tnum mt-0.5 truncate text-lg font-bold',
          tone === 'positive' && 'text-leaf-600',
          tone === 'negative' && 'text-brand-600',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
