import { LogOutIcon, PhoneIcon, MapPinIcon, DownloadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MonthSelector } from '@/components/dashboard/month-selector'
import { TargetForm } from '@/components/dashboard/target-form'
import { BrundavanLogo } from '@/components/brand'
import { useAuth } from '@/providers/auth-provider'
import { useSales } from '@/providers/sales-provider'
import { HOTEL, SALES_MODEL_NOTE } from '@/calculations/config'
import { useMonthlyMetrics } from '@/hooks/useMetrics'
import { buildMonthCsv, downloadCsv, monthCsvFileName } from '@/lib/csv'
import { formatMonthLabel } from '@/lib/date'

export function SettingsPage() {
  const { signOutUser, displayName, backend } = useAuth()
  const { monthKey, loading } = useSales()
  const monthly = useMonthlyMetrics()

  function handleExport() {
    if (monthly.entries.length === 0) {
      toast.error('No sales recorded for this month yet.')
      return
    }
    downloadCsv(buildMonthCsv(monthly), monthCsvFileName(monthKey))
    toast.success('Spreadsheet downloaded.')
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-1">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Monthly target</CardTitle>
          <CardDescription>
            Each month has its own target. The daily target is worked out from it automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MonthSelector />
          <Separator />
          <TargetForm monthKey={monthKey} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hotel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BrundavanLogo className="h-10 w-auto max-w-[220px]" />
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {HOTEL.addressLine1}
                <br />
                {HOTEL.addressLine2}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <PhoneIcon className="size-4 shrink-0" aria-hidden />
              <a href={`tel:${HOTEL.phone.replace(/\s/g, '')}`} className="hover:underline">
                {HOTEL.phone}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Download for accounts</CardTitle>
          <CardDescription>
            Every day of {formatMonthLabel(monthKey)} as a spreadsheet, with a totals row.
            Opens in Excel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleExport}
            disabled={loading}
          >
            <DownloadIcon className="size-4" />
            {loading ? 'Loading…' : `Download ${formatMonthLabel(monthKey)} (CSV)`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How sales are counted</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{SALES_MODEL_NOTE}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Signed in as {displayName ?? 'Manager'}</p>
            <p className="text-xs text-muted-foreground">
              {backend === 'firebase' ? 'Synced to the cloud' : 'Saved on this device only'}
            </p>
          </div>
          <Button variant="outline" onClick={() => void signOutUser()}>
            <LogOutIcon className="size-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
