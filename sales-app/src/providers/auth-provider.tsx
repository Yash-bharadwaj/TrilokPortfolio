import * as React from 'react'
import { isFirebaseConfigured, usernameToEmail } from '@/firebase/env'
import { friendlyError } from '@/lib/errors'

const LOCAL_SESSION_KEY = 'sbg.session.v1'

/*
 * Credentials for the on-device mode used before Firebase is connected.
 *
 * There is deliberately NO default password. A literal here would be compiled
 * into the JavaScript every visitor downloads, so anyone could read it — and
 * since the same password is used for the real Firebase account, that would
 * hand over the live data. On-device mode therefore stays switched off unless
 * someone sets VITE_LOCAL_PASSWORD for a local build.
 */
const LOCAL_USERNAME = (import.meta.env.VITE_LOCAL_USERNAME || 'trilok').toLowerCase()
const LOCAL_PASSWORD: string = import.meta.env.VITE_LOCAL_PASSWORD ?? ''

interface AuthState {
  ready: boolean
  userId: string | null
  displayName: string | null
  signIn: (username: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
  backend: 'firebase' | 'local'
}

const AuthContext = React.createContext<AuthState | null>(null)

/** The Firebase SDK is fetched on demand so the login screen paints first. */
async function firebaseAuthModule() {
  const [{ getFirebaseAuth }, sdk] = await Promise.all([
    import('@/firebase/client'),
    import('firebase/auth'),
  ])
  return { auth: getFirebaseAuth(), sdk }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(!isFirebaseConfigured)
  const [user, setUser] = React.useState<{ id: string; name: string } | null>(() => {
    if (isFirebaseConfigured) return null
    try {
      const raw = localStorage.getItem(LOCAL_SESSION_KEY)
      return raw ? (JSON.parse(raw) as { id: string; name: string }) : null
    } catch {
      return null
    }
  })

  React.useEffect(() => {
    if (!isFirebaseConfigured) return
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    void (async () => {
      try {
        const { auth, sdk } = await firebaseAuthModule()
        if (cancelled) return
        await sdk.setPersistence(auth, sdk.browserLocalPersistence).catch(() => {
          /* falls back to the default persistence */
        })
        if (cancelled) return
        unsubscribe = sdk.onAuthStateChanged(auth, (next) => {
          setUser(next ? { id: next.uid, name: next.email?.split('@')[0] ?? 'Manager' } : null)
          setReady(true)
        })
      } catch {
        // Could not reach Firebase at all — show the login screen rather than
        // leaving the manager on a spinner for ever.
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const signIn = React.useCallback(async (username: string, password: string) => {
    if (!isFirebaseConfigured) {
      if (!LOCAL_PASSWORD) {
        throw new Error('This app is not connected yet. Please contact the owner.')
      }
      const ok = username.trim().toLowerCase() === LOCAL_USERNAME && password === LOCAL_PASSWORD
      if (!ok) throw new Error('Incorrect username or password.')
      const session = { id: 'local-user', name: username.trim() }
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session))
      setUser(session)
      return
    }
    try {
      const { auth, sdk } = await firebaseAuthModule()
      await sdk.signInWithEmailAndPassword(auth, usernameToEmail(username), password)
    } catch (error) {
      throw new Error(friendlyError(error, 'Incorrect username or password.'))
    }
  }, [])

  const signOutUser = React.useCallback(async () => {
    if (!isFirebaseConfigured) {
      localStorage.removeItem(LOCAL_SESSION_KEY)
      setUser(null)
      return
    }
    const { auth, sdk } = await firebaseAuthModule()
    await sdk.signOut(auth)
  }, [])

  const value = React.useMemo<AuthState>(
    () => ({
      ready,
      userId: user?.id ?? null,
      displayName: user?.name ?? null,
      signIn,
      signOutUser,
      backend: isFirebaseConfigured ? 'firebase' : 'local',
    }),
    [ready, user, signIn, signOutUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const ctx = React.use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
