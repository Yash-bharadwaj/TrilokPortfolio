/**
 * THE ONE AMBIGUOUS BUSINESS RULE, ISOLATED.
 * ---------------------------------------------------------------------------
 * The handwritten sheet lists `Net Sale | Swiggy | Zomato | Total Sale`, which
 * on its own does not say whether Total = Net, or Total = Net + Swiggy + Zomato.
 *
 * The written brief's sample figures pointed one way: its five seed days of net
 * sales sum to the month-to-date total it quotes (2,41,648), and its channel
 * split sums to the same number — both of which only hold if Net already
 * contained the aggregators.
 *
 * The hotel says otherwise, and the hotel decides: Net Sales is restaurant
 * trade (dine-in and takeaway), entered on its own, with Swiggy and Zomato
 * entered separately and added on top. So:
 *
 *     total  = net + swiggy + zomato
 *     direct = net
 *
 * Worth knowing: under this rule the brief's own "Total Sale" column and its
 * quoted MTD figure do not reconcile, so that column likely meant something
 * else. Nothing here depends on it.
 *
 * If this ever changes again, flip SALES_MODEL. Nothing outside this file
 * needs to change.
 */
export type SalesModel = 'net-includes-online' | 'net-excludes-online'

export const SALES_MODEL: SalesModel = 'net-excludes-online'

/**
 * HOW THE HOTEL WRITES ITS NUMBERS.
 * ---------------------------------------------------------------------------
 * The handwritten sheet is kept as a running month-to-date total: each line is
 * everything up to and including that day, not that day on its own. The hotel
 * enters it the same way, so the app accepts it the same way.
 *
 * What is stored is exactly what was typed. Daily figures are derived on read
 * by subtracting each line from the one before. Keeping the typed figure as the
 * source of truth is what makes a late correction safe: fill in a day that was
 * missed, and every day after it re-derives correctly. Converting to daily at
 * save time could not do that, because the original line would be gone.
 *
 * Switch to 'daily' and entries are taken as that day's takings instead.
 */
export type EntryMode = 'cumulative' | 'daily'

export const ENTRY_MODE: EntryMode = 'cumulative'

/**
 * Wording that follows the model. A lookup rather than comparisons, because at
 * module scope TypeScript narrows the constant to its own literal.
 */
const MODEL_TEXT = {
  'net-includes-online': {
    note: 'Net Sales is the full day total. Swiggy and Zomato are shown as a split of it, and Direct is the remainder.',
    direct: 'Direct',
    net: 'Total sales for the day',
    netHint: 'Including Swiggy and Zomato orders.',
  },
  'net-excludes-online': {
    note: 'Restaurant sales (dine-in and takeaway) are entered on their own. Swiggy and Zomato are added on top to give the day total.',
    direct: 'Restaurant',
    net: 'Restaurant sales',
    netHint: 'Dine-in and takeaway only. Add Swiggy and Zomato below.',
  },
} as const satisfies Record<SalesModel, { note: string; direct: string; net: string; netHint: string }>

/** Shown in Settings so the rule is never a hidden assumption. */
export const SALES_MODEL_NOTE: string = MODEL_TEXT[SALES_MODEL].note

/** What the restaurant's own (non-aggregator) sales are called in the UI. */
export const DIRECT_LABEL: string = MODEL_TEXT[SALES_MODEL].direct

/** Label and hint for the required amount on the entry form. */
export const NET_LABEL: string = MODEL_TEXT[SALES_MODEL].net
export const NET_HINT: string = MODEL_TEXT[SALES_MODEL].netHint

/** Wording for the entry form, which depends on how the hotel writes its sheet. */
const ENTRY_TEXT = {
  cumulative: {
    note: 'Figures are entered as a running total for the month, exactly as the sheet is kept. Each day is worked out by subtracting the line before.',
    suffix: ' so far this month',
    hint: 'Running total for the month, as written on the sheet — not just today.',
  },
  daily: {
    note: 'Figures are entered as that day on its own. The app adds up the month.',
    suffix: '',
    hint: '',
  },
} as const satisfies Record<EntryMode, { note: string; suffix: string; hint: string }>

export const ENTRY_MODE_NOTE: string = ENTRY_TEXT[ENTRY_MODE].note
/** Appended to every money label on the form, e.g. "Restaurant sales so far this month". */
export const ENTRY_LABEL_SUFFIX: string = ENTRY_TEXT[ENTRY_MODE].suffix
export const ENTRY_MODE_HINT: string = ENTRY_TEXT[ENTRY_MODE].hint

/** Day total credited against the target. */
export function totalSalesOf(entry: {
  netSales: number
  swiggySales: number
  zomatoSales: number
}): number {
  return SALES_MODEL === 'net-includes-online'
    ? entry.netSales
    : entry.netSales + entry.swiggySales + entry.zomatoSales
}

/** Counter / walk-in sales, derived rather than entered. */
export function directSalesOf(entry: {
  netSales: number
  swiggySales: number
  zomatoSales: number
}): number {
  return SALES_MODEL === 'net-includes-online'
    ? entry.netSales - entry.swiggySales - entry.zomatoSales
    : entry.netSales
}

/**
 * Pace tolerance. Inside ±2% of the straight-line expectation we call it
 * "on track" rather than claiming the hotel is ahead or behind on noise.
 */
export const PACE_TOLERANCE = 0.02

/** A projection from one or two days of trading is not worth presenting as fact. */
export const MIN_DAYS_FOR_CONFIDENT_PROJECTION = 3

/**
 * Who the report comes from. Shown on every generated image, so the owner can
 * see at a glance who prepared it. One place to change if the GM changes.
 */
export const REPORT_SIGNATURE = {
  name: 'Trilok',
  role: 'General Manager',
} as const

export const HOTEL = {
  name: 'Sai Brundavan Grand',
  addressLine1: 'Integrated Market, 2-77, Parupalli Veedhi',
  addressLine2: 'Siddipet, Telangana 502103',
  city: 'Siddipet, Telangana',
  phone: '091333 95222',
  id: 'sai-brundavan-grand',
} as const
