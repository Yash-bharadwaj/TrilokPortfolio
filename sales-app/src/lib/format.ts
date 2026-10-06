const inr = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

const inrPrecise = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

/** `₹2,41,648` — Indian digit grouping, no decimals. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `₹${inr.format(Math.round(value))}`
}

/** Keeps paise, for derived per-day figures where rounding would mislead. */
export function formatCurrencyPrecise(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `₹${inrPrecise.format(value)}`
}

/** `+₹3,120` / `−₹753` — always carries its sign. */
export function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value)
  if (rounded === 0) return '₹0'
  const sign = rounded > 0 ? '+' : '−'
  return `${sign}₹${inr.format(Math.abs(rounded))}`
}

export function formatNumber(value: number): string {
  return inr.format(value)
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatSignedPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

/** `2.4L` / `₹52.3K` — for chart axes, where full numbers never fit on a phone. */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`
  if (abs >= 1000) return `₹${Math.round(value / 1000)}K`
  return `₹${Math.round(value)}`
}

/** Strips everything but digits, so the field can never hold letters. */
export function digitsOnly(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

/** Live display formatting for a numeric input: `50000` → `50,000`. */
export function groupDigits(raw: string): string {
  const clean = digitsOnly(raw).replace(/^0+(?=\d)/, '')
  if (!clean) return ''
  return inr.format(Number(clean))
}
