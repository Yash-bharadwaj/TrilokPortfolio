import * as React from 'react'
import {
  AlertCircleIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  LoaderIcon,
  Share2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ReportCanvas, REPORT_WIDTH } from './report-canvas'
import { canShareFiles, captureReport, downloadBlob, reportFileName, shareOrDownload } from '@/lib/report-image'
import { HOTEL } from '@/calculations/config'
import { buildMonthCsv, downloadCsv, monthCsvFileName } from '@/lib/csv'
import { buildMonthPdf, monthPdfFileName } from '@/lib/report-pdf'
import { brundavanLogoSrc } from '@/components/brand'
import { cn } from '@/lib/utils'
import type { ReportData } from '@/types'

type Phase = 'idle' | 'generating' | 'ready' | 'error'

/**
 * Generate → preview → send. The manager sees the exact image the owner will
 * receive before anything leaves the phone.
 */
export function ReportSheet({
  data,
  open,
  onOpenChange,
}: {
  data: ReportData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [preview, setPreview] = React.useState<string | null>(null)
  const [sharing, setSharing] = React.useState(false)
  const [building, setBuilding] = React.useState<'pdf' | 'csv' | null>(null)
  const blobRef = React.useRef<Blob | null>(null)

  const fileName = data
    ? reportFileName(data.kind, data.kind === 'daily' ? data.daily.date : data.monthly.monthKey)
    : 'report.png'

  // Re-generate whenever the sheet opens for a different report.
  React.useEffect(() => {
    if (!open || !data) return
    let cancelled = false
    setPhase('generating')
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })

    // Two frames so the off-screen canvas has definitely laid out.
    const run = async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (cancelled || !canvasRef.current) return
      try {
        const blob = await captureReport(canvasRef.current)
        if (cancelled) return
        blobRef.current = blob
        setPreview(URL.createObjectURL(blob))
        setPhase('ready')
      } catch {
        if (!cancelled) setPhase('error')
      }
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [open, data])

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function handleShare() {
    if (!blobRef.current) return
    setSharing(true)
    try {
      const { method } = await shareOrDownload(
        blobRef.current,
        fileName,
        `${HOTEL.name} — ${data?.kind === 'daily' ? 'Daily' : 'Month'} sales report`,
      )
      if (method === 'downloaded') toast.success('Report saved to your downloads.')
    } catch {
      toast.error('Could not share the report. Try saving it instead.')
    } finally {
      setSharing(false)
    }
  }

  /** The logo as a data URL, so jsPDF can embed it without a network fetch. */
  async function logoDataUrl(): Promise<string | undefined> {
    try {
      const response = await fetch(brundavanLogoSrc)
      const blob = await response.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => resolve(undefined as unknown as string)
        reader.readAsDataURL(blob)
      })
    } catch {
      return undefined
    }
  }

  async function handlePdf() {
    if (!data || building) return
    setBuilding('pdf')
    try {
      const blob = await buildMonthPdf(data.monthly, await logoDataUrl())
      downloadBlob(blob, monthPdfFileName(data.monthly.monthLabel))
      toast.success('PDF downloaded.')
    } catch {
      toast.error('Could not build the PDF. Please try again.')
    } finally {
      setBuilding(null)
    }
  }

  function handleCsv() {
    if (!data) return
    setBuilding('csv')
    try {
      downloadCsv(buildMonthCsv(data.monthly), monthCsvFileName(data.monthly.monthKey))
      toast.success('Spreadsheet downloaded.')
    } catch {
      toast.error('Could not build the spreadsheet. Please try again.')
    } finally {
      setBuilding(null)
    }
  }

  function handleSave() {
    if (!blobRef.current) return
    downloadBlob(blobRef.current, fileName)
    toast.success('Report saved. You can now send it from your gallery.')
  }

  const nativeShare = canShareFiles()
  const isMonth = data?.kind === 'mtd'

  return (
    <>
      {/* Off-screen at true size: the image never depends on the phone's width. */}
      {open && data && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: -20000,
            width: REPORT_WIDTH,
            // Height is left to the content: the month report is as tall as its
            // table needs, and the capture measures it.
            pointerEvents: 'none',
            opacity: 1,
            zIndex: -1,
          }}
        >
          <ReportCanvas ref={canvasRef} data={data} />
        </div>
      )}

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="gap-4">
          <SheetHeader>
            <SheetTitle>
              {phase === 'ready' ? 'Report ready' : phase === 'error' ? 'Could not create report' : 'Preparing report…'}
            </SheetTitle>
            <SheetDescription>
              {data?.kind === 'daily'
                ? "A full day report, including this month's totals up to that day."
                : 'A full month summary with targets, channels and performance.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex max-h-[46dvh] items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/40 p-2">
            {phase === 'ready' && preview ? (
              <img
                src={preview}
                alt="Preview of the generated sales report"
                className="max-h-[42dvh] w-auto rounded-lg object-contain shadow-sm"
              />
            ) : phase === 'error' ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <AlertCircleIcon className="size-6 text-destructive" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Something went wrong making the image. Please try again.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <LoaderIcon className="size-6 animate-spin text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">Generating report…</p>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            {nativeShare && (
              <Button size="lg" onClick={handleShare} disabled={phase !== 'ready' || sharing}>
                {sharing ? (
                  <LoaderIcon className="size-5 animate-spin" />
                ) : (
                  <Share2Icon className="size-5" />
                )}
                Send report
              </Button>
            )}

            {/* A month can also be taken away as a document or a spreadsheet. */}
            <div className={cn('grid gap-2', isMonth ? 'grid-cols-3' : 'grid-cols-1')}>
              <Button
                variant={nativeShare ? 'outline' : 'default'}
                onClick={handleSave}
                disabled={phase !== 'ready'}
                className="h-auto flex-col gap-1 py-3"
              >
                <ImageIcon className="size-5" />
                <span className="text-xs font-semibold">Image</span>
              </Button>

              {isMonth && (
                <>
                  <Button
                    variant="outline"
                    onClick={handlePdf}
                    disabled={building !== null}
                    className="h-auto flex-col gap-1 py-3"
                  >
                    {building === 'pdf' ? (
                      <LoaderIcon className="size-5 animate-spin" />
                    ) : (
                      <FileTextIcon className="size-5" />
                    )}
                    <span className="text-xs font-semibold">PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCsv}
                    disabled={building !== null}
                    className="h-auto flex-col gap-1 py-3"
                  >
                    <FileSpreadsheetIcon className="size-5" />
                    <span className="text-xs font-semibold">Excel</span>
                  </Button>
                </>
              )}
            </div>

            {isMonth && (
              <p className="px-1 text-center text-xs text-muted-foreground">
                PDF keeps every day on numbered pages. Excel opens the spreadsheet (.csv).
              </p>
            )}
            {!nativeShare && !isMonth && (
              <p className="px-1 text-center text-xs text-muted-foreground">
                Save the image, then attach it in WhatsApp.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
