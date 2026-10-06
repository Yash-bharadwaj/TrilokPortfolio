import { LightbulbIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Insight } from '@/types'

const DOT = {
  positive: 'bg-leaf-500',
  negative: 'bg-brand-500',
  neutral: 'bg-muted-foreground/50',
} as const

/** Plain sentences, each one arithmetic on recorded figures. */
export function InsightsCard({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <LightbulbIcon className="size-4 text-brand-600" aria-hidden />
        <CardTitle>What this means</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {insights.map((insight) => (
            <li key={insight.id} className="flex gap-2.5 text-sm leading-relaxed">
              <span
                className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', DOT[insight.tone])}
                aria-hidden
              />
              <span className="min-w-0">{insight.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
