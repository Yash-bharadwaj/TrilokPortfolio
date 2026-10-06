import type { DailySales, MonthSettings } from '@/types'
import { emptySettings, sortEntries, type SalesRepository } from './repository'
import { monthKeyOfDay } from '@/lib/date'

const KEY = 'sbg.sales.v1'

interface Store {
  sales: Record<string, DailySales>
  targets: Record<string, number>
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { sales: {}, targets: {} }
    const parsed = JSON.parse(raw) as Partial<Store>
    return { sales: parsed.sales ?? {}, targets: parsed.targets ?? {} }
  } catch {
    return { sales: {}, targets: {} }
  }
}

function write(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('sbg:store-changed'))
}

/**
 * On-device store used until Firebase credentials are supplied. It implements
 * the same contract as Firestore, so swapping to the cloud changes nothing but
 * which repository the provider builds.
 */
export function createLocalRepository(): SalesRepository {
  return {
    subscribeMonth(monthKey, onData) {
      const emit = () => {
        const store = read()
        const entries = sortEntries(
          Object.values(store.sales).filter((e) => monthKeyOfDay(e.date) === monthKey),
        )
        const settings: MonthSettings = {
          ...emptySettings(monthKey),
          monthlyTarget: store.targets[monthKey] ?? 0,
        }
        onData({ monthKey, entries, settings, fromCache: false })
      }
      emit()
      window.addEventListener('sbg:store-changed', emit)
      window.addEventListener('storage', emit)
      return () => {
        window.removeEventListener('sbg:store-changed', emit)
        window.removeEventListener('storage', emit)
      }
    },

    async saveDay(entry) {
      const store = read()
      store.sales[entry.date] = { ...entry, updatedAt: Date.now() }
      write(store)
    },

    async deleteDay(date) {
      const store = read()
      delete store.sales[date]
      write(store)
    },

    async saveMonthlyTarget(monthKey, target) {
      const store = read()
      store.targets[monthKey] = target
      write(store)
    },
  }
}

export function hasLocalData(): boolean {
  const store = read()
  return Object.keys(store.sales).length > 0 || Object.keys(store.targets).length > 0
}

export function exportLocalData(): Store {
  return read()
}
