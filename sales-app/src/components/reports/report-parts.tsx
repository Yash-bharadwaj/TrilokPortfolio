import type * as React from 'react'
import { brundavanLogoSrc } from '@/components/brand'
import { formatLongDate } from '@/lib/date'
import { HOTEL, REPORT_SIGNATURE } from '@/calculations/config'
import type { PerformanceTone } from '@/types'

export const REPORT_WIDTH = 1080
/** The daily report is a fixed card; the month report grows with the days in it. */
export const DAILY_REPORT_HEIGHT = 1350

export const INK = {
  paper: '#fffdfb',
  panel: '#faf7f3',
  panelLine: '#eee7de',
  rule: '#eae3da',
  text: '#1a1614',
  soft: '#3b322d',
  muted: '#8d837c',
  faint: '#9a8f87',
  brand: '#8f1d2c',
  good: '#0d6b3d',
  bad: '#a4162e',
} as const

export const TONE_STYLE: Record<PerformanceTone, { bg: string; border: string; text: string }> = {
  ahead: { bg: '#eefaf2', border: '#9fe0bb', text: '#0d6b3d' },
  'on-track': { bg: '#f5f2ee', border: '#ddd4c8', text: '#3b322d' },
  behind: { bg: '#fdf5e7', border: '#efcf96', text: '#8a5a08' },
  unknown: { bg: '#f5f2ee', border: '#ddd4c8', text: '#6b625c' },
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 19,
        letterSpacing: 2.6,
        fontWeight: 700,
        color: INK.faint,
        textTransform: 'uppercase',
        margin: 0,
      }}
    >
      {children}
    </p>
  )
}

export function Rule() {
  return <div style={{ height: 1, background: INK.rule, width: '100%' }} />
}

export function StatCell({
  label,
  value,
  sub,
  color = INK.text,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  // Long rupee figures would otherwise run past the column at the full size.
  const size = value.length > 12 ? 30 : value.length > 10 ? 34 : 38
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 19, color: INK.muted, margin: 0, fontWeight: 600 }}>{label}</p>
      <p
        style={{
          fontSize: size,
          fontWeight: 700,
          color,
          margin: '6px 0 0',
          letterSpacing: -0.8,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 19,
            fontWeight: 600,
            color,
            opacity: 0.7,
            margin: '2px 0 0',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

export function MeterRow({
  label,
  value,
  share,
  color,
  compact,
  format,
}: {
  label: string
  value: number
  share: number
  color: string
  compact?: boolean
  format: (v: number) => string
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: compact ? '2px 0' : '4px 0' }}
    >
      <span style={{ width: 13, height: 13, borderRadius: 99, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 24, fontWeight: 600, color: INK.soft }}>{label}</span>
      <span
        style={{
          fontSize: 25,
          fontWeight: 700,
          color: INK.text,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {format(value)}
      </span>
      <span
        style={{
          width: 96,
          textAlign: 'right',
          fontSize: 23,
          color: INK.muted,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {share.toFixed(1)}%
      </span>
    </div>
  )
}

export function Bar({ slices, total }: { slices: { share: number; color: string }[]; total: number }) {
  if (total <= 0) return null
  return (
    <div
      style={{
        display: 'flex',
        height: 14,
        borderRadius: 99,
        overflow: 'hidden',
        background: '#f0ebe4',
        gap: 2,
      }}
    >
      {slices
        .filter((s) => s.share > 0)
        .map((s, i) => (
          <div key={i} style={{ width: `${Math.max(1, s.share)}%`, background: s.color }} />
        ))}
    </div>
  )
}

export function Masthead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <img
        src={brundavanLogoSrc}
        alt="Sai Brundavan Grand"
        width={805}
        height={212}
        style={{ width: 312, height: 82, objectFit: 'contain' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 40, height: 1, background: '#d8cec3' }} />
        <SectionLabel>{kicker}</SectionLabel>
        <span style={{ width: 40, height: 1, background: '#d8cec3' }} />
      </div>
      <p
        style={{
          fontFamily: "'Fraunces Variable', Fraunces, Georgia, serif",
          fontSize: 32,
          fontWeight: 600,
          margin: 0,
          color: INK.soft,
        }}
      >
        {title}
      </p>
    </div>
  )
}

export function ReportFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${INK.rule}`,
        padding: '15px 64px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 0.4 }}>
          {HOTEL.name.toUpperCase()}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 19, color: INK.muted }}>
          {HOTEL.addressLine2} · {HOTEL.phone}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: INK.soft }}>
          Generated &amp; curated by {REPORT_SIGNATURE.name}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 18, color: INK.faint }}>
          {REPORT_SIGNATURE.role} · {formatLongDate(generatedAt)}
        </p>
      </div>
    </div>
  )
}

export function Verdict({
  tone,
  emoji,
  label,
  detail,
  bullets,
}: {
  tone: PerformanceTone
  emoji: string
  label: string
  detail: string
  bullets?: string[]
}) {
  const style = TONE_STYLE[tone]
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${style.border}`,
        background: style.bg,
        padding: '13px 22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 34, lineHeight: 1 }}>{emoji}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 27, fontWeight: 800, color: style.text }}>{label}</p>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 19,
              color: style.text,
              opacity: 0.88,
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {detail}
          </p>
        </div>
      </div>
      {bullets && bullets.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: '9px 0 0',
            padding: '9px 0 0',
            borderTop: `1px solid ${style.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          {bullets.map((text, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 18,
                lineHeight: 1.3,
                color: style.text,
                opacity: 0.9,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 99,
                  background: style.text,
                  opacity: 0.55,
                  marginTop: 8,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
