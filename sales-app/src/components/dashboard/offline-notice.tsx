import { CloudOffIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

/**
 * Shown when the device is offline and this month has never reached us from the
 * server. Without it the dashboard would add up only the unsent entries and
 * present that as the month's total — a wrong number is worse than no number.
 */
export function OfflineNotice({ pendingWrites }: { pendingWrites: number }) {
  return (
    <Card className="p-5 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-secondary">
        <CloudOffIcon className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-semibold">You are offline</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This month's totals need an internet connection. They will appear as soon as you are
        back online.
      </p>
      {pendingWrites > 0 && (
        <p className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-xs font-medium text-leaf-700">
          {pendingWrites === 1
            ? '1 entry is saved on this phone and will sync automatically.'
            : `${pendingWrites} entries are saved on this phone and will sync automatically.`}
        </p>
      )}
    </Card>
  )
}
