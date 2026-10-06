import * as React from 'react'
import { EyeIcon, EyeOffIcon, LoaderIcon, LockIcon, UserIcon } from 'lucide-react'
import { BrundavanLogo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/auth-provider'
import { HOTEL } from '@/calculations/config'

export function LoginPage() {
  const { signIn } = useAuth()
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await signIn(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect username or password.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-50/60 to-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrundavanLogo className="h-14 w-auto max-w-[280px]" />
          <p className="mt-3 text-sm text-muted-foreground">{HOTEL.city}</p>
          <h1 className="mt-6 text-xl font-bold">Sales Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="username">
              <UserIcon className="size-4 text-muted-foreground" aria-hidden />
              Username
            </Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={error ? true : undefined}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              <LockIcon className="size-4 text-muted-foreground" aria-hidden />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="password"
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {showPassword ? (
                  <EyeOffIcon className="size-5" aria-hidden />
                ) : (
                  <EyeIcon className="size-5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <LoaderIcon className="size-5 animate-spin" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
