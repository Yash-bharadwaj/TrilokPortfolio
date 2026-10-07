import * as React from 'react'
import {
  AlertCircleIcon,
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


  function handleSave() {
    if (!blobRef.current) return
    downloadBlob(blobRef.current, fileName)
    toast.success('Report saved. You can now send it from your gallery.')
  }

  const nativeShare = canShareFiles()

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

            <Button
              size="lg"
              variant={nativeShare ? 'outline' : 'default'}
              onClick={handleSave}
              disabled={phase !== 'ready'}
            >
              <ImageIcon className="size-5" />
              Save image
            </Button>

            {!nativeShare && (
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
