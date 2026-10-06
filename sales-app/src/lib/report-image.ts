import { REPORT_HEIGHT, REPORT_WIDTH } from '@/components/reports/report-canvas'
import { HOTEL } from '@/calculations/config'
import { formatMonthLabel } from '@/lib/date'
import type { ReportKind } from '@/types'

const SLUG = HOTEL.name.replace(/\s+/g, '-')

/** `Sai-Brundavan-Grand-Daily-Report-2026-10-05.png` */
export function reportFileName(kind: ReportKind, key: string): string {
  return kind === 'daily'
    ? `${SLUG}-Daily-Report-${key}.png`
    : `${SLUG}-MTD-Report-${formatMonthLabel(key).replace(/\s+/g, '-')}.png`
}

/**
 * Captures the fixed-size report node to a PNG.
 *
 * Fonts are self-hosted, so they are same-origin and inline reliably. If
 * embedding still fails on some browser we retry without it rather than leaving
 * the manager with no report at all.
 */
export async function captureReport(node: HTMLElement): Promise<Blob> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* proceed — the fallback stack is still legible */
    }
  }

  const options = {
    width: REPORT_WIDTH,
    height: REPORT_HEIGHT,
    canvasWidth: REPORT_WIDTH,
    canvasHeight: REPORT_HEIGHT,
    pixelRatio: 1,
    backgroundColor: '#fffdfb',
    cacheBust: true,
  } as const

  // Pulled in on demand: nobody pays for the imaging library until they share.
  const { toBlob } = await import('html-to-image')

  let blob: Blob | null = null
  try {
    blob = await toBlob(node, options)
  } catch {
    blob = await toBlob(node, { ...options, skipFonts: true })
  }
  if (!blob) throw new Error('Could not create the report image.')
  return blob
}

export interface ShareOutcome {
  method: 'shared' | 'downloaded'
}

/** Native share sheet when the device offers it, a download when it does not. */
export async function shareOrDownload(blob: Blob, fileName: string, title: string): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return { method: 'shared' }
    } catch (error) {
      // The user dismissing the sheet is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { method: 'shared' }
      }
      // Anything else (permission, unsupported) falls through to a download.
    }
  }

  downloadBlob(blob, fileName)
  return { method: 'downloaded' }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function canShareFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({
      files: [new File([new Blob([''], { type: 'image/png' })], 'probe.png', { type: 'image/png' })],
    })
  } catch {
    return false
  }
}
