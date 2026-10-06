import * as React from 'react'
import { isFirebaseConfigured } from '@/firebase/env'
import { createLocalRepository } from '@/services/localRepository'
import type { MonthSnapshot, SalesRepository } from '@/services/repository'
import { emptySettings } from '@/services/repository'
import { flushOutbox, withOutbox } from '@/services/outboxRepository'
import { listPending, OUTBOX_EVENT } from '@/services/outbox'
import { shiftMonth } from '@/lib/date'
import type { DailySales, MonthSettings } from '@/types'
import { currentMonthKey, monthKeyOfDay } from '@/lib/date'
import { friendlyError } from '@/lib/errors'
import { useAuth } from './auth-provider'

export type SyncStatus = 'synced' | 'pending' | 'offline'

interface SalesState {
  monthKey: string
  setMonthKey: (key: string) => void
  entries: DailySales[]
  settings: MonthSettings
  loading: boolean
  error: string | null
  syncStatus: SyncStatus
  isOnline: boolean
  entryFor: (date: string) => DailySales | null
  /** Previous month's totals, fetched once for the comparison. */
  previousMonth: MonthSnapshot | null
  /** Writes saved on the device but not yet confirmed by the server. */
  pendingWrites: number
  /**
   * False until this month's data has actually come back from the server.
   * Offline from a cold start we hold only unsent entries, which must not be
   * presented as if they were the whole month.
   */
  hasServerData: boolean
  saveDay: (entry: DailySales) => Promise<void>
  deleteDay: (date: string) => Promise<void>
  saveMonthlyTarget: (monthKey: string, target: number) => Promise<void>
}

const EMPTY_ENTRIES: DailySales[] = []

/** How long to wait for the first snapshot before telling the user something is wrong. */
const LOAD_TIMEOUT_MS = 15000

const SalesContext = React.createContext<SalesState | null>(null)

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth()
  const [monthKey, setMonthKey] = React.useState(currentMonthKey)
  const [snapshot, setSnapshot] = React.useState<MonthSnapshot | null>(null)
  const [hasServerData, setHasServerData] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine)

  // Firestore is loaded on demand; until it arrives (or when Firebase is not
  // configured at all) the on-device store serves the same contract.
  const [repository, setRepository] = React.useState<SalesRepository | null>(null)
  const repositoryRef = React.useRef<SalesRepository | null>(null)
  repositoryRef.current = repository

  React.useEffect(() => {
    let cancelled = false
    if (isFirebaseConfigured && userId) {
      void import('@/services/firestoreRepository').then((m) => {
        if (cancelled) return
        // Only the cloud repository needs an outbox; the on-device store is
        // already durable by definition.
        const remote = m.createFirestoreRepository(userId)
        flushOutbox(remote)
        setRepository(() => withOutbox(remote))
      })
    } else {
      setRepository(() => createLocalRepository())
    }
    return () => {
      cancelled = true
    }
  }, [userId])

  const [pendingWrites, setPendingWrites] = React.useState(() => listPending().length)

  React.useEffect(() => {
    const sync = () => setPendingWrites(listPending().length)
    const on = () => {
      setIsOnline(true)
      sync()
    }
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener(OUTBOX_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener(OUTBOX_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // Anything still queued goes out as soon as the connection returns.
  React.useEffect(() => {
    if (!repositoryRef.current || !isOnline || pendingWrites === 0) return
    flushOutbox(repositoryRef.current)
  }, [isOnline, pendingWrites])

  React.useEffect(() => {
    if (!repository) return
    setLoading(true)
    setError(null)
    setHasServerData(false)

    // If the first snapshot never arrives we say so, rather than leaving the
    // manager looking at loading skeletons with no idea what is wrong. We never
    // fall back to showing an empty month, because "no sales recorded" would be
    // a lie that could prompt someone to enter a day twice.
    const watchdog = window.setTimeout(() => {
      setLoading(false)
      setError('Could not reach the sales data. Check your internet and try again.')
    }, LOAD_TIMEOUT_MS)

    const unsubscribe = repository.subscribeMonth(
      monthKey,
      (next) => {
        window.clearTimeout(watchdog)
        setSnapshot(next)
        if (!next.fromCache) setHasServerData(true)
        setError(null)
        setLoading(false)
      },
      (err) => {
        window.clearTimeout(watchdog)
        setError(friendlyError(err, 'Could not load sales. Please try again.'))
        setLoading(false)
      },
    )
    return () => {
      window.clearTimeout(watchdog)
      unsubscribe()
    }
  }, [repository, monthKey])

  // Kept referentially stable: returning a fresh `[]` on every render would
  // re-create every downstream callback and re-render the whole dashboard.
  const fresh = snapshot?.monthKey === monthKey
  const entries = React.useMemo(
    () => (fresh && snapshot ? snapshot.entries : EMPTY_ENTRIES),
    [fresh, snapshot],
  )
  const settings = React.useMemo(
    () => (fresh && snapshot ? snapshot.settings : emptySettings(monthKey)),
    [fresh, snapshot, monthKey],
  )

  const syncStatus: SyncStatus = !isOnline
    ? 'offline'
    : pendingWrites > 0 || (snapshot?.fromCache && isFirebaseConfigured)
      ? 'pending'
      : 'synced'

  const [previousMonth, setPreviousMonth] = React.useState<MonthSnapshot | null>(null)

  React.useEffect(() => {
    if (!repository) return
    let cancelled = false
    setPreviousMonth(null)
    // A one-off read, not a listener: a finished month does not change.
    void repository
      .getMonthSnapshot(shiftMonth(monthKey, -1))
      .then((snap) => {
        if (!cancelled) setPreviousMonth(snap)
      })
      .catch(() => {
        if (!cancelled) setPreviousMonth(null)
      })
    return () => {
      cancelled = true
    }
  }, [repository, monthKey])

  const entryFor = React.useCallback(
    (date: string) => entries.find((e) => e.date === date) ?? null,
    [entries],
  )

  const saveDay = React.useCallback(
    async (entry: DailySales) => {
      if (!repository) throw new Error('Still starting up. Please try again in a moment.')
      await repository.saveDay(entry)
      // Writing into a month we are not watching should pull the view with it.
      const target = monthKeyOfDay(entry.date)
      if (target !== monthKey) setMonthKey(target)
    },
    [repository, monthKey],
  )

  const deleteDay = React.useCallback(
    async (date: string) => {
      if (!repository) throw new Error('Still starting up. Please try again in a moment.')
      await repository.deleteDay(date)
    },
    [repository],
  )

  const saveMonthlyTarget = React.useCallback(
    async (key: string, target: number) => {
      if (!repository) throw new Error('Still starting up. Please try again in a moment.')
      await repository.saveMonthlyTarget(key, target)
    },
    [repository],
  )

  const value = React.useMemo<SalesState>(
    () => ({
      monthKey,
      setMonthKey,
      entries,
      settings,
      loading: (loading || !repository) && snapshot?.monthKey !== monthKey,
      error,
      syncStatus,
      isOnline,
      entryFor,
      previousMonth,
      pendingWrites,
      hasServerData,
      saveDay,
      deleteDay,
      saveMonthlyTarget,
    }),
    [
      repository,
      monthKey,
      entries,
      settings,
      loading,
      snapshot,
      error,
      syncStatus,
      isOnline,
      entryFor,
      previousMonth,
      pendingWrites,
      hasServerData,
      saveDay,
      deleteDay,
      saveMonthlyTarget,
    ],
  )

  return <SalesContext value={value}>{children}</SalesContext>
}

export function useSales(): SalesState {
  const ctx = React.use(SalesContext)
  if (!ctx) throw new Error('useSales must be used inside SalesProvider')
  return ctx
}
