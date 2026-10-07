/** A single calendar day of trading, exactly as the manager types it in. */
export interface DailySales {
  /** Canonical day key, `YYYY-MM-DD`. Also the Firestore document id. */
  date: string
  netSales: number
  swiggySales: number
  zomatoSales: number
  vegSales: number
  nonVegSales: number
  expenses: number
  note?: string
  createdAt?: number
  updatedAt?: number
  createdBy?: string
}

/** Per-month settings. Targets belong to a month, never to the app as a whole. */
export interface MonthSettings {
  /** `YYYY-MM`. */
  monthKey: string
  monthlyTarget: number
  updatedAt?: number
}

export interface ChannelBreakdown {
  total: number
  direct: number
  swiggy: number
  zomato: number
  directShare: number
  swiggyShare: number
  zomatoShare: number
  /** Online channels exceed the recorded total — the entry needs checking. */
  inconsistent: boolean
}

export interface FoodBreakdown {
  veg: number
  nonVeg: number
  foodTotal: number
  vegShare: number
  nonVegShare: number
  /** Share of total sales that was itemised as veg/non-veg. */
  coverage: number
  recorded: boolean
}

export interface DailyMetrics {
  date: string
  entry: DailySales | null
  /** Total credited for the day under the active sales model. */
  totalSales: number
  netSales: number
  expenses: number
  salesAfterExpenses: number
  baseDailyTarget: number
  variance: number
  achievement: number | null
  channels: ChannelBreakdown
  food: FoodBreakdown
}

export type PerformanceTone = 'ahead' | 'on-track' | 'behind' | 'unknown'

export interface PerformanceStatus {
  tone: PerformanceTone
  label: string
  emoji: string
  detail: string
  /** MTD sales minus the straight-line expectation for the days elapsed. */
  paceVariance: number
}

export interface Projection {
  /** Average daily sales × days in month. Null when there is nothing to project from. */
  projected: number | null
  varianceToTarget: number | null
  /** Fewer than three recorded days — present it as an early estimate only. */
  lowConfidence: boolean
}

export interface MonthlyMetrics {
  monthKey: string
  monthLabel: string
  /** Last day included. For the live month this is today; for a report, the report date. */
  asOf: string
  daysInMonth: number
  daysElapsed: number
  daysRemaining: number
  daysRecorded: number
  monthlyTarget: number
  mtdSales: number
  mtdNetSales: number
  mtdExpenses: number
  mtdSalesAfterExpenses: number
  achievement: number | null
  remaining: number
  baseDailyTarget: number
  expectedToDate: number
  averageDailySales: number | null
  requiredDailyPace: number | null
  projection: Projection
  channels: ChannelBreakdown
  food: FoodBreakdown
  status: PerformanceStatus
  entries: DailySales[]
}

export interface Insight {
  id: string
  text: string
  tone: 'positive' | 'negative' | 'neutral'
  /**
   * Whether the statement is about the single day or about the month. A month
   * report must never carry "today's sales are…", which would read as nonsense
   * to an owner opening it a week later.
   */
  scope: 'day' | 'month'
}

export type ReportKind = 'daily' | 'mtd'

export interface ReportData {
  kind: ReportKind
  daily: DailyMetrics
  monthly: MonthlyMetrics
  insights: Insight[]
  generatedAt: number
}

export interface UserProfile {
  uid: string
  hotelId: string
  displayName: string
  role: 'owner' | 'manager' | 'staff'
}
