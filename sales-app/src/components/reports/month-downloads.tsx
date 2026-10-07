import * as React from 'react'
import { FileSpreadsheetIcon, FileTextIcon, ImageIcon, LoaderIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { captureReport, downloadBlob, reportFileName } from '@/lib/report-image'
import { buildMonthCsv, downloadCsv, monthCsvFileName } from '@/lib/csv'
import { buildMonthPdf, monthPdfFileName } from '@/lib/report-pdf'
import { brundavanLogoSrc } from '@/components/brand'
import { REPORT_WIDTH } from '@/components/reports/report-parts'
import type { ReportData } from '@/types'

const ReportCanvas = React.lazy(() =>
  import('./report-canvas').then((m) => ({ default: m.ReportCanvas })),
)

type Job = 'image' | 'pdf' | 'csv' | null

/** The logo as a data URL, so jsPDF can embed it without a network fetch. */
async function logoDataUrl(): Promise<string | undefined> {
  try {
    const response = await fetch(brundavanLogoSrc)
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

/**
 * Takes the month away in whichever form is wanted, without going through the
 * share sheet first. Sharing and downloading are different errands: sharing
 * wants a picture to send, downloading wants a file to keep.
 */
export function MonthDownloads({
  build,
  asOf,
  monthLabel,
  monthKey,
  disabled,
}: {
  build: () => ReportData
  asOf: string
  monthLabel: string
  monthKey: string
  disabled: boolean
}) {
  const [job, setJob] = React.useState<Job>(null)
  const [pending, setPending] = React.useState<ReportData | null>(null)
  const canvasRef = React.useRef<HTMLDivElement>(null)

  // The image is captured from a canvas mounted off-screen for just long enough.
  React.useEffect(() => {
    if (!pending) return
    let cancelled = false

    const run = async () => {
      // The canvas is lazily loaded, so wait for it to actually mount.
      for (let i = 0; i < 60 && !canvasRef.current; i += 1) {
        await new Promise((r) => setTimeout(r, 50))
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (cancelled || !canvasRef.current) {
        if (!cancelled) {
          toast.error('Could not build the image. Please try again.')
          setPending(null)
          setJob(null)
        }
        return
      }
      try {
        const blob = await captureReport(canvasRef.current)
        if (cancelled) return
        downloadBlob(blob, reportFileName('mtd', monthKey))
        toast.success('Image downloaded.')
      } catch {
        if (!cancelled) toast.error('Could not build the image. Please try again.')
      } finally {
        if (!cancelled) {
          setPending(null)
          setJob(null)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [pending, monthKey])

  function handleImage() {
    if (job || disabled) return
    setJob('image')
    setPending(build())
  }

  async function handlePdf() {
    if (job || disabled) return
    setJob('pdf')
    try {
      const blob = await buildMonthPdf(build().monthly, await logoDataUrl())
      downloadBlob(blob, monthPdfFileName(monthLabel))
      toast.success('PDF downloaded.')
    } catch {
      toast.error('Could not build the PDF. Please try again.')
    } finally {
      setJob(null)
    }
  }

  function handleCsv() {
    if (job || disabled) return
    setJob('csv')
    try {
      downloadCsv(buildMonthCsv(build().monthly), monthCsvFileName(monthKey))
      toast.success('Spreadsheet downloaded.')
    } catch {
      toast.error('Could not build the spreadsheet. Please try again.')
    } finally {
      setJob(null)
    }
  }

  const actions = [
    { id: 'pdf' as const, label: 'Download PDF', icon: FileTextIcon, onClick: handlePdf },
    { id: 'csv' as const, label: 'Download Excel', icon: FileSpreadsheetIcon, onClick: handleCsv },
    { id: 'image' as const, label: 'Download Image', icon: ImageIcon, onClick: handleImage },
  ]

  return (
    <>
      {/* One full-width button per row, so each reads as a single clear action
          rather than three tiles to decode. */}
      <div className="space-y-2">
        {actions.map(({ id, label, icon: Icon, onClick }) => (
          <Button
            key={id}
            size="lg"
            onClick={onClick}
            disabled={disabled || job !== null}
            className="w-full justify-center gap-2"
          >
            {job === id ? (
              <LoaderIcon className="size-5 shrink-0 animate-spin" />
            ) : (
              <Icon className="size-5 shrink-0" />
            )}
            {job === id ? 'Preparing…' : label}
          </Button>
        ))}
      </div>

      {pending && (
        <React.Suspense fallback={null}>
          <div
            aria-hidden
            style={{
              position: 'fixed',
              top: 0,
              left: -20000,
              width: REPORT_WIDTH,
              pointerEvents: 'none',
              zIndex: -1,
            }}
          >
            <ReportCanvas ref={canvasRef} data={pending} />
          </div>
        </React.Suspense>
      )}
      <span className="sr-only" aria-live="polite">
        {job ? `Preparing the ${job} for ${monthLabel}` : ''}
      </span>
      <span className="hidden">{asOf}</span>
    </>
  )
}
