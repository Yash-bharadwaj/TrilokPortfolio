import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { getDb } from '@/firebase/client'
import { HOTEL_ID } from '@/firebase/env'
import type { DailySales, MonthSettings } from '@/types'
import { emptySettings, sortEntries, type MonthSnapshot, type SalesRepository } from './repository'
import { monthKeyOfDay } from '@/lib/date'

/**
 * hotels/{hotelId}/months/{YYYY-MM}              → { monthlyTarget }
 * hotels/{hotelId}/months/{YYYY-MM}/sales/{YYYY-MM-DD} → one trading day
 *
 * Keying the sales document by its date gives duplicate protection for free and
 * keeps a month to at most 31 documents, so the dashboard reads one small
 * collection rather than scanning history.
 */
function monthDoc(monthKey: string) {
  return doc(getDb(), 'hotels', HOTEL_ID, 'months', monthKey)
}

function salesCollection(monthKey: string) {
  return collection(getDb(), 'hotels', HOTEL_ID, 'months', monthKey, 'sales')
}

function toDailySales(id: string, data: DocumentData): DailySales {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    date: typeof data.date === 'string' ? data.date : id,
    netSales: num(data.netSales),
    swiggySales: num(data.swiggySales),
    zomatoSales: num(data.zomatoSales),
    vegSales: num(data.vegSales),
    nonVegSales: num(data.nonVegSales),
    expenses: num(data.expenses),
    note: typeof data.note === 'string' ? data.note : undefined,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
  }
}

export function createFirestoreRepository(userId: string): SalesRepository {
  return {
    subscribeMonth(monthKey, onData, onError) {
      let entries: DailySales[] = []
      let settings: MonthSettings = emptySettings(monthKey)
      let fromCache = true
      let seenSales = false
      let seenSettings = false

      const emit = () => {
        if (!seenSales || !seenSettings) return
        const snapshot: MonthSnapshot = { monthKey, entries, settings, fromCache }
        onData(snapshot)
      }

      const unsubSales = onSnapshot(
        salesCollection(monthKey),
        (snap) => {
          entries = sortEntries(snap.docs.map((d) => toDailySales(d.id, d.data())))
          fromCache = snap.metadata.fromCache
          seenSales = true
          emit()
        },
        onError,
      )

      const unsubSettings = onSnapshot(
        monthDoc(monthKey),
        (snap) => {
          const data = snap.data()
          settings = {
            monthKey,
            monthlyTarget:
              typeof data?.monthlyTarget === 'number' && Number.isFinite(data.monthlyTarget)
                ? data.monthlyTarget
                : 0,
          }
          seenSettings = true
          emit()
        },
        onError,
      )

      return () => {
        unsubSales()
        unsubSettings()
      }
    },

    async getMonthSnapshot(monthKey) {
      const [salesSnap, monthSnap] = await Promise.all([
        getDocs(salesCollection(monthKey)),
        getDoc(monthDoc(monthKey)),
      ])
      const data = monthSnap.data()
      return {
        monthKey,
        entries: sortEntries(salesSnap.docs.map((d) => toDailySales(d.id, d.data()))),
        settings: {
          monthKey,
          monthlyTarget:
            typeof data?.monthlyTarget === 'number' && Number.isFinite(data.monthlyTarget)
              ? data.monthlyTarget
              : 0,
        },
        fromCache: salesSnap.metadata.fromCache,
      }
    },

    async saveDay(entry) {
      const monthKey = monthKeyOfDay(entry.date)
      // The month document must exist for the sales subcollection to be listed
      // in the console, and it carries the target.
      await setDoc(
        monthDoc(monthKey),
        { monthKey, updatedAt: serverTimestamp() },
        { merge: true },
      )
      await setDoc(
        doc(salesCollection(monthKey), entry.date),
        {
          date: entry.date,
          netSales: entry.netSales,
          swiggySales: entry.swiggySales,
          zomatoSales: entry.zomatoSales,
          vegSales: entry.vegSales,
          nonVegSales: entry.nonVegSales,
          expenses: entry.expenses,
          ...(entry.note ? { note: entry.note } : {}),
          createdBy: userId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    },

    async deleteDay(date) {
      await deleteDoc(doc(salesCollection(monthKeyOfDay(date)), date))
    },

    async saveMonthlyTarget(monthKey, target) {
      await setDoc(
        monthDoc(monthKey),
        { monthKey, monthlyTarget: target, updatedAt: serverTimestamp() },
        { merge: true },
      )
    },
  }
}
