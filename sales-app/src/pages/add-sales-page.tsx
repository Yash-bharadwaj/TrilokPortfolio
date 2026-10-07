import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InfoIcon, LoaderIcon, TriangleAlertIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DateField } from '@/components/dashboard/date-field'
import { useSales } from '@/providers/sales-provider'
import { collectSoftWarnings, dailySalesSchema, type DailySalesValues } from '@/schemas/sales'
import { daysInMonthOf, formatLongDate, monthKeyOfDay, todayKey } from '@/lib/date'
import { NET_HINT, NET_LABEL, totalSalesOf } from '@/calculations/config'
import { formatCurrency, formatSignedCurrencyWithPercent } from '@/lib/format'
import { friendlyError } from '@/lib/errors'
import { cn } from '@/lib/utils'

type FormValues = {
  date: string
  netSales: number | null
  swiggySales: number | null
  zomatoSales: number | null
  vegSales: number | null
  nonVegSales: number | null
  expenses: number | null
  note?: string
}

const BLANK: Omit<FormValues, 'date'> = {
  netSales: null,
  swiggySales: null,
  zomatoSales: null,
  vegSales: null,
  nonVegSales: null,
  expenses: null,
  note: '',
}

function MoneyField({
  label,
  hint,
  optional,
  error,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  optional?: boolean
  error?: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="justify-between">
        <span>
          {label}
          {optional && <span className="ml-1.5 font-normal text-muted-foreground">optional</span>}
        </span>
      </Label>
      {children}
      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function AddSalesPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { entryFor, saveDay, deleteDay, settings, loading, monthKey, setMonthKey, entries } =
    useSales()

  const requested = params.get('date')
  const initialDate = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayKey()

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(dailySalesSchema) as never,
    defaultValues: { date: initialDate, ...BLANK },
    mode: 'onSubmit',
  })

  const date = watch('date')
  const dateMonth = monthKeyOfDay(date)

  // A date outside the month currently being watched pulls the subscription
  // with it, so its existing record can be found at all.
  React.useEffect(() => {
    if (dateMonth !== monthKey) setMonthKey(dateMonth)
  }, [dateMonth, monthKey, setMonthKey])

  const ready = !loading && dateMonth === monthKey
  const existing = ready ? entryFor(date) : null
  const hydratedFor = React.useRef<string | null>(null)

  /*
   * Load whatever is already recorded for the chosen date, so the manager edits
   * that day rather than unknowingly replacing it.
   *
   * This waits for the month to finish loading. Hydrating earlier would show an
   * empty form for a day that already has sales — and saving it would wipe the
   * record with zeros.
   */
  React.useEffect(() => {
    if (!ready || hydratedFor.current === date) return
    hydratedFor.current = date
    const entry = entryFor(date)
    reset({
      date,
      netSales: entry ? entry.netSales : null,
      swiggySales: entry ? entry.swiggySales : null,
      zomatoSales: entry ? entry.zomatoSales : null,
      vegSales: entry ? entry.vegSales : null,
      nonVegSales: entry ? entry.nonVegSales : null,
      expenses: entry ? entry.expenses : null,
      note: entry?.note ?? '',
    })
  }, [ready, date, entryFor, reset])

  const values = watch()

  // What the month already holds before this date, used to spot a running
  // total being entered where a single day belongs.
  const dayContext = React.useMemo(() => {
    const prior = entries.filter((e) => e.date < date && monthKeyOfDay(e.date) === dateMonth)
    return {
      monthToDateBefore: prior.reduce((sum, e) => sum + totalSalesOf(e), 0),
      priorDays: prior.length,
    }
  }, [entries, date, dateMonth])

  const warnings = React.useMemo(
    () => collectSoftWarnings(values, dayContext),
    [values, dayContext],
  )

  // The per-day figure is always derived from the month's target and the real
  // number of days in that month — it is never entered by hand.
  // The figure that is actually credited against the target, recalculated on
  // every keystroke so the manager never has to add it up.
  const dayTotal = totalSalesOf({
    netSales: values.netSales ?? 0,
    swiggySales: values.swiggySales ?? 0,
    zomatoSales: values.zomatoSales ?? 0,
  })

  const dailyTarget =
    settings.monthlyTarget > 0 && dateMonth === settings.monthKey
      ? settings.monthlyTarget / daysInMonthOf(dateMonth)
      : 0

  async function onSubmit(raw: FormValues) {
    const parsed = raw as unknown as DailySalesValues
    try {
      await saveDay({
        date: parsed.date,
        netSales: raw.netSales ?? 0,
        swiggySales: raw.swiggySales ?? 0,
        zomatoSales: raw.zomatoSales ?? 0,
        vegSales: raw.vegSales ?? 0,
        nonVegSales: raw.nonVegSales ?? 0,
        expenses: raw.expenses ?? 0,
        note: raw.note?.trim() || undefined,
      })
      toast.success(existing ? 'Sales updated.' : 'Sales saved.')
      navigate(`/?share=${parsed.date}`, { replace: true })
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save. Please try again.'))
    }
  }

  async function handleDelete() {
    try {
      await deleteDay(date)
      toast.success('Sales deleted.')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(friendlyError(err, 'Could not delete. Please try again.'))
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-1">
      <div>
        <h1 className="text-xl font-bold">{existing ? 'Edit sales' : 'Add daily sales'}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Only the day's total is required. Everything else is optional.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Card className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DateField id="date" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.date && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {errors.date.message}
              </p>
            )}
          </div>

          {existing && (
            <p className="flex gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground">
              <InfoIcon className="size-4 shrink-0" aria-hidden />
              <span>
                Sales for {formatLongDate(date)} already exist. Saving will update them.
              </span>
            </p>
          )}

          {dailyTarget > 0 && (
            <p className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5 text-xs">
              <span className="text-muted-foreground">Target for this day</span>
              <span className="tnum font-semibold">{formatCurrency(dailyTarget)}</span>
            </p>
          )}

          <MoneyField
            label={NET_LABEL}
            htmlFor="netSales"
            hint={NET_HINT}
            error={errors.netSales?.message}
          >
            <Controller
              control={control}
              name="netSales"
              render={({ field }) => (
                <CurrencyInput
                  id="netSales"
                  autoFocus={!existing}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.netSales)}
                />
              )}
            />
          </MoneyField>
        </Card>

        <Card className="space-y-4 p-4">
          <p className="text-sm font-semibold">Online orders</p>
          <p className="-mt-2 text-xs text-muted-foreground">
            Added on top of restaurant sales. Leave blank if there were none.
          </p>
          <MoneyField label="Swiggy" htmlFor="swiggySales" optional error={errors.swiggySales?.message}>
            <Controller
              control={control}
              name="swiggySales"
              render={({ field }) => (
                <CurrencyInput id="swiggySales" value={field.value} onValueChange={field.onChange} />
              )}
            />
          </MoneyField>
          <MoneyField label="Zomato" htmlFor="zomatoSales" optional error={errors.zomatoSales?.message}>
            <Controller
              control={control}
              name="zomatoSales"
              render={({ field }) => (
                <CurrencyInput id="zomatoSales" value={field.value} onValueChange={field.onChange} />
              )}
            />
          </MoneyField>
        </Card>

        <Card className="border-brand-200 bg-brand-50/60 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                Day total
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Restaurant + Swiggy + Zomato
              </p>
            </div>
            <p className="tnum shrink-0 text-2xl font-extrabold" aria-live="polite">
              {formatCurrency(dayTotal)}
            </p>
          </div>
          {dailyTarget > 0 && dayTotal > 0 && (
            <p className="mt-2 border-t border-brand-200/70 pt-2 text-xs text-muted-foreground">
              <span
                className={
                  dayTotal >= dailyTarget ? 'font-semibold text-leaf-600' : 'font-semibold text-brand-600'
                }
              >
                {formatSignedCurrencyWithPercent(dayTotal - dailyTarget, dailyTarget)}
              </span>{' '}
              vs today's target of {formatCurrency(dailyTarget)}
            </p>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <p className="text-sm font-semibold">Food split &amp; expenses</p>
          <MoneyField label="Veg sales" htmlFor="vegSales" optional error={errors.vegSales?.message}>
            <Controller
              control={control}
              name="vegSales"
              render={({ field }) => (
                <CurrencyInput id="vegSales" value={field.value} onValueChange={field.onChange} />
              )}
            />
          </MoneyField>
          <MoneyField
            label="Non-Veg sales"
            htmlFor="nonVegSales"
            optional
            error={errors.nonVegSales?.message}
          >
            <Controller
              control={control}
              name="nonVegSales"
              render={({ field }) => (
                <CurrencyInput id="nonVegSales" value={field.value} onValueChange={field.onChange} />
              )}
            />
          </MoneyField>
          <Separator />
          <MoneyField label="Expenses" htmlFor="expenses" optional error={errors.expenses?.message}>
            <Controller
              control={control}
              name="expenses"
              render={({ field }) => (
                <CurrencyInput
                  id="expenses"
                  value={field.value}
                  onValueChange={field.onChange}
                  enterKeyHint="done"
                />
              )}
            />
          </MoneyField>
          <div className="space-y-1.5">
            <Label htmlFor="note">
              Note <span className="ml-1.5 font-normal text-muted-foreground">optional</span>
            </Label>
            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <Input
                  id="note"
                  placeholder="e.g. Festival day"
                  maxLength={200}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </Card>

        {warnings.length > 0 && (
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li
                key={w.id}
                className={cn(
                  'flex gap-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed',
                  w.level === 'warning'
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-secondary text-muted-foreground',
                )}
              >
                {w.level === 'warning' ? (
                  <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
                ) : (
                  <InfoIcon className="size-4 shrink-0" aria-hidden />
                )}
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="sticky bottom-24 space-y-2 md:bottom-4">
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-raise"
            disabled={isSubmitting || !ready}
          >
            {(isSubmitting || !ready) && <LoaderIcon className="size-5 animate-spin" />}
            {!ready ? 'Loading…' : isSubmitting ? 'Saving…' : existing ? 'Save changes' : 'Save sales'}
          </Button>
        </div>
      </form>

      {existing && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full text-destructive hover:bg-brand-50">
              <Trash2Icon className="size-4" />
              Delete this day
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete sales record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove sales for {formatLongDate(date)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:brightness-110"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
