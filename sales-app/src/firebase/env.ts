import { HOTEL } from '@/calculations/config'

/**
 * Configuration only — deliberately free of any Firebase import, so the app
 * shell and login screen can render before the SDK chunk has downloaded.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Firebase is optional at build time. With no credentials the app runs against
 * on-device storage instead, so the hotel can use it before the project exists.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.authDomain,
)

export const HOTEL_ID = import.meta.env.VITE_HOTEL_ID || HOTEL.id

/** The login screen asks for a username; Firebase Auth needs an email. */
export const AUTH_EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'saibrundavangrand.in'

export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase()
  return clean.includes('@') ? clean : `${clean}@${AUTH_EMAIL_DOMAIN}`
}
