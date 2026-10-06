import type { DailySales } from '@/types'
import { monthKeyOfDay } from '@/lib/date'

const KEY = 'sbg.outbox.v1'
export const OUTBOX_EVENT = 'sbg:outbox-changed'

/** What a caller asks to be queued. */
export type PendingOpInput =
  | { kind: 'save-day'; entry: DailySales }
  | { kind: 'delete-day'; date: string }
  | { kind: 'save-target'; monthKey: string; target: number }

/** The same, once stored. (`Omit` over a union would collapse the variants.) */
export type PendingOp = PendingOpInput & { id: string; queuedAt: number }

/**
 * A durable queue of writes that have not yet been confirmed by the server.
 *
 * Firestore keeps unsent writes in memory only, so closing the app would lose
 * them. Keeping them here means an entry made on a bad connection survives the
 * app being closed, and is sent when the connection returns.
 *
 * Every operation is an idempotent overwrite (`setDoc` or `delete` on a known
 * document id), so replaying one that in fact reached the server is harmless.
 * That is what makes the simple "queue, send, then dequeue" order safe.
 */
function read(): PendingOp[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PendingOp[]) : []
  } catch {
    return []
  }
}

function write(ops: PendingOp[]) {
  try {
    if (ops.length === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(ops))
  } catch {
    // A full or blocked storage box must not stop the write itself.
  }
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT))
}

export function listPending(): PendingOp[] {
  return read()
}

/**
 * Queues an operation, replacing any earlier one for the same document so a day
 * edited five times offline sends once, with its final values.
 */
export function enqueue(op: PendingOpInput): PendingOp {
  const stored: PendingOp = { ...op, id: opId(op), queuedAt: Date.now() }
  const ops = read().filter((existing) => existing.id !== stored.id)
  ops.push(stored)
  write(ops)
  return stored
}

export function dequeue(id: string): void {
  const ops = read()
  const next = ops.filter((op) => op.id !== id)
  if (next.length !== ops.length) write(next)
}

export function opId(op: PendingOpInput): string {
  switch (op.kind) {
    case 'save-day':
      return `day:${op.entry.date}`
    case 'delete-day':
      return `day:${op.date}`
    case 'save-target':
      return `target:${op.monthKey}`
  }
}

/** Pending day records for a month, newest intent winning over the server copy. */
export function pendingForMonth(monthKey: string): {
  saves: DailySales[]
  deletes: Set<string>
  target: number | null
} {
  const saves: DailySales[] = []
  const deletes = new Set<string>()
  let target: number | null = null

  for (const op of read()) {
    if (op.kind === 'save-day' && monthKeyOfDay(op.entry.date) === monthKey) saves.push(op.entry)
    else if (op.kind === 'delete-day' && monthKeyOfDay(op.date) === monthKey) deletes.add(op.date)
    else if (op.kind === 'save-target' && op.monthKey === monthKey) target = op.target
  }
  return { saves, deletes, target }
}

export function clearOutbox(): void {
  write([])
}
