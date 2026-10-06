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

export const HOTEL = {
  name: 'Sai Brundavan Grand',
  addressLine1: 'Integrated Market, 2-77, Parupalli Veedhi',
  addressLine2: 'Siddipet, Telangana 502103',
  city: 'Siddipet, Telangana',
  phone: '091333 95222',
  id: 'sai-brundavan-grand',
} as const
