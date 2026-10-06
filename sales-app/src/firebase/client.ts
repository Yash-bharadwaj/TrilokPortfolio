import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'
import { firebaseConfig } from './env'

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function ensureApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(ensureApp())
  return auth
}

/*
 * Firestore with its default in-memory cache.
 *
 * IndexedDB persistence (`persistentLocalCache`) was tried and removed. If the
 * page is navigated away from while Firestore is still claiming the IndexedDB
 * primary lease, the next load blocks forever inside
 * `updateClientMetadataAndTryBecomePrimary` — the dashboard sits on loading
 * skeletons, and a reload does not clear it, because the stale lease lives in
 * IndexedDB. Recovering needs site data to be cleared by hand, which is not
 * something a hotel manager can be asked to do.
 *
 * What is kept without it: writes made while offline are still queued and sent
 * when the connection returns, and data already loaded stays readable for the
 * session. What is lost: reading past months offline after a cold start.
 * That trade is worth it for a tool that must never hang.
 */
export function getDb(): Firestore {
  if (!db) db = initializeFirestore(ensureApp(), {})
  return db
}
