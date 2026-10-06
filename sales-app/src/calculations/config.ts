/**
 * THE ONE AMBIGUOUS BUSINESS RULE, ISOLATED.
 * ---------------------------------------------------------------------------
 * The handwritten sheet lists `Net Sale | Swiggy | Zomato | Total Sale`, which
 * on its own does not say whether Total = Net, or Total = Net + Swiggy + Zomato.
 *
 * The brief's own figures settle it. The five seed days of net sales
 *   38,456 + 53,685 + 55,810 + 41,866 + 51,831 = 2,41,648
 * reproduce the quoted month-to-date total of ₹2,41,648 exactly, and the quoted
 * channel split (Direct 1,81,348 + Swiggy 32,500 + Zomato 27,800) sums to the
 * same ₹2,41,648. Both only hold if NET SALES ALREADY CONTAINS the aggregator
 * sales, and Direct is the remainder.
 *
 * So: total = net, and direct = net − swiggy − zomato.
 *
 * If the hotel ever confirms the opposite, flip SALES_MODEL to
 * 'net-excludes-online'. Nothing outside this file needs to change.
 */
export type SalesModel = 'net-includes-online' | 'net-excludes-online'

export const SALES_MODEL: SalesModel = 'net-includes-online'

/** Human-readable note shown in Settings so the rule is never a hidden assumption. */
export const SALES_MODEL_NOTE =
  SALES_MODEL === 'net-includes-online'
    ? 'Net Sales is the full day total. Swiggy and Zomato are shown as a split of it, and Direct is the remainder.'
    : 'Net Sales covers counter sales only. Swiggy and Zomato are added on top to form the day total.'

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
