import * as React from 'react'
import { LoaderIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useSales } from '@/providers/sales-provider'
import { monthlyTargetSchema } from '@/schemas/sales'
import { formatCurrency } from '@/lib/format'
import { formatMonthLabel, daysInMonthOf } from '@/lib/date'
import { friendlyError } from '@/lib/errors'

/** Used for first-run setup and in Settings — one form, one behaviour. */
export function TargetForm({
  monthKey,
  onSaved,
  submitLabel = 'Save target',
}: {
  monthKey: string
  onSaved?: () => void
  submitLabel?: string
}) {
  const { settings, saveMonthlyTarget } = useSales()
  const [value, setValue] = React.useState<number | null>(settings.monthlyTarget || null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    setValue(settings.monthlyTarget || null)
  }, [settings.monthlyTarget, monthKey])

  const days = daysInMonthOf(monthKey)
  const perDay = value && value > 0 ? value / days : null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = monthlyTargetSchema.safeParse({ monthlyTarget: value ?? Number.NaN })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please enter a monthly target.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await saveMonthlyTarget(monthKey, parsed.data.monthlyTarget)
      toast.success('Monthly target saved.')
      onSaved?.()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save the target. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <Label htmlFor="monthly-target">Monthly target for {formatMonthLabel(monthKey)}</Label>
        <CurrencyInput
          id="monthly-target"
          value={value}
          onValueChange={(v) => {
            setValue(v)
            setError(null)
          }}
          invalid={Boolean(error)}
          enterKeyHint="done"
        />
        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {perDay
              ? `That works out to ${formatCurrency(perDay)} per day across ${days} days.`
              : `Will be divided across ${days} days.`}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <LoaderIcon className="size-5 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}
