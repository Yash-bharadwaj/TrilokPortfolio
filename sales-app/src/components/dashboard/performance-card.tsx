import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { PerformanceStatus } from '@/types'

const TONE = {
  ahead: 'border-leaf-300 bg-leaf-50 text-leaf-700',
  'on-track': 'border-border bg-secondary/60 text-foreground',
  behind: 'border-amber-300 bg-amber-50 text-amber-900',
  unknown: 'border-border bg-secondary/60 text-muted-foreground',
} as const

/** Plain-English verdict, never a misleading one. */
export function PerformanceCard({ status }: { status: PerformanceStatus }) {
  return (
    <Card className={cn('border p-4', TONE[status.tone])} role="status">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          {status.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{status.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed opacity-90">{status.detail}</p>
        </div>
      </div>
    </Card>
  )
}
