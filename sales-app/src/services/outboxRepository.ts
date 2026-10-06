import type { DailySales } from '@/types'
import type { MonthSnapshot, SalesRepository } from './repository'
import { sortEntries } from './repository'
import { dequeue, enqueue, listPending, pendingForMonth, type PendingOp, type PendingOpInput } from './outbox'

/**
 * Wraps a repository so every write is first recorded in a durable outbox, then
 * sent. The caller's promise resolves as soon as the operation is safely queued,
 * which is what lets the manager save on a bad connection and carry on; the
 * header shows "Saving" until the server confirms.
 *
 * Reads are overlaid with anything still pending, so a day entered offline is
 * visible straight away rather than vanishing until it syncs.
 */
export function withOutbox(inner: SalesRepository): SalesRepository {
  const send = (op: PendingOp): Promise<void> => {
    const run =
      op.kind === 'save-day'
        ? inner.saveDay(op.entry)
        : op.kind === 'delete-day'
          ? inner.deleteDay(op.date)
          : inner.saveMonthlyTarget(op.monthKey, op.target)

    return run.then(
      () => dequeue(op.id),
      () => {
        // Stays queued; flushed on reconnect or next start.
      },
    )
  }

  const queueAndSend = async (op: PendingOpInput) => {
    void send(enqueue(op))
  }

  return {
    subscribeMonth(monthKey, onData, onError) {
      const overlay = (snapshot: MonthSnapshot): MonthSnapshot => {
        const { saves, deletes, target } = pendingForMonth(monthKey)
        const byDate = new Map<string, DailySales>()
        for (const entry of snapshot.entries) byDate.set(entry.date, entry)
        for (const entry of saves) byDate.set(entry.date, entry)
        for (const date of deletes) byDate.delete(date)
        return {
          ...snapshot,
          entries: sortEntries([...byDate.values()]),
          settings:
            target === null
              ? snapshot.settings
              : { ...snapshot.settings, monthlyTarget: target },
        }
      }

      let last: MonthSnapshot | null = null
      const emit = () => {
        if (last) onData(overlay(last))
      }

      const unsubscribe = inner.subscribeMonth(
        monthKey,
        (next) => {
          last = next
          emit()
        },
        onError,
      )

      // Re-apply the overlay whenever the queue changes.
      window.addEventListener('sbg:outbox-changed', emit)
      return () => {
        window.removeEventListener('sbg:outbox-changed', emit)
        unsubscribe()
      }
    },

    getMonthSnapshot: (monthKey) => inner.getMonthSnapshot(monthKey),

    saveDay: (entry) => queueAndSend({ kind: 'save-day', entry }),
    deleteDay: (date) => queueAndSend({ kind: 'delete-day', date }),
    saveMonthlyTarget: (monthKey, target) =>
      queueAndSend({ kind: 'save-target', monthKey, target }),
  }
}

/** Retries everything still queued. Called on start and whenever the device reconnects. */
export function flushOutbox(inner: SalesRepository): void {
  for (const op of listPending()) {
    const run =
      op.kind === 'save-day'
        ? inner.saveDay(op.entry)
        : op.kind === 'delete-day'
          ? inner.deleteDay(op.date)
          : inner.saveMonthlyTarget(op.monthKey, op.target)
    void run.then(
      () => dequeue(op.id),
      () => undefined,
    )
  }
}
