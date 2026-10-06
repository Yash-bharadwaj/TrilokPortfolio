import { CloudOffIcon, LoaderIcon, CheckIcon } from 'lucide-react'
import { useSales } from '@/providers/sales-provider'
import { cn } from '@/lib/utils'

const MAP = {
  synced: { icon: CheckIcon, label: 'Synced', className: 'text-leaf-600' },
  pending: { icon: LoaderIcon, label: 'Saving', className: 'text-amber-600' },
  offline: { icon: CloudOffIcon, label: 'Offline', className: 'text-muted-foreground' },
} as const

/** Entered data is never silently lost — the manager can always see where it stands. */
export function SyncBadge({ className }: { className?: string }) {
  const { syncStatus } = useSales()
  const { icon: Icon, label, className: tone } = MAP[syncStatus]
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[0.7rem] font-semibold', tone, className)}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn('size-3', syncStatus === 'pending' && 'animate-spin')} aria-hidden />
      {label}
    </span>
  )
}
