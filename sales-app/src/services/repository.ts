import type { DailySales, MonthSettings } from '@/types'

export interface MonthSnapshot {
  monthKey: string
  entries: DailySales[]
  settings: MonthSettings
  /** True once the data has arrived from the server rather than the local cache. */
  fromCache: boolean
}

export interface SalesRepository {
  /** Live month feed. Returns an unsubscribe function. */
  subscribeMonth(
    monthKey: string,
    onData: (snapshot: MonthSnapshot) => void,
    onError: (error: unknown) => void,
  ): () => void
  /** One-off read, used for the previous-month comparison. No listener is kept open. */
  getMonthSnapshot(monthKey: string): Promise<MonthSnapshot>
  saveDay(entry: DailySales): Promise<void>
  deleteDay(date: string): Promise<void>
  saveMonthlyTarget(monthKey: string, target: number): Promise<void>
}

export function sortEntries(entries: DailySales[]): DailySales[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

export function emptySettings(monthKey: string): MonthSettings {
  return { monthKey, monthlyTarget: 0 }
}
