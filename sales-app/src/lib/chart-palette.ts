/**
 * Chart colours, validated with the dataviz six-checks validator against a white
 * surface (lightness band, chroma floor, CVD separation, normal-vision floor and
 * 3:1 contrast all pass). Do not substitute by eye — re-run the validator.
 *
 * Veg/Non-Veg deliberately reuse the logo's own green and red diet marks, which
 * is the convention every Indian diner already reads correctly.
 */
export const CHANNEL_COLORS = {
  direct: '#c41f3b',
  swiggy: '#c2740f',
  zomato: '#2563eb',
} as const

export const FOOD_COLORS = {
  veg: '#15a05a',
  nonVeg: '#a4162e',
} as const

export const CHART_INK = {
  grid: '#e8e1d8',
  axis: '#7a6f68',
  bar: '#c41f3b',
  barMuted: '#f0a3ae',
  target: '#7a6f68',
} as const
