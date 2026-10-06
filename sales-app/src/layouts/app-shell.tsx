import { HomeIcon, PlusIcon, CalendarDaysIcon, SettingsIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrundavanLogo } from '@/components/brand'
import { SyncBadge } from '@/components/sync-badge'
import { cn } from '@/lib/utils'
import { HOTEL } from '@/calculations/config'

/**
 * Four destinations, no more. Sharing a report is not a place you navigate to —
 * it is a button on the home screen and on every day in History.
 */
const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true, primary: false },
  { to: '/history', label: 'History', icon: CalendarDaysIcon, end: false, primary: false },
  { to: '/add', label: 'Add Sales', icon: PlusIcon, end: false, primary: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false, primary: false },
] as const

export function AppShell() {
  const { pathname } = useLocation()
  const isActive = (to: string, end: boolean) => (end ? pathname === to : pathname.startsWith(to))

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="safe-top sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <NavLink to="/" className="flex min-w-0 items-center" aria-label="Sai Brundavan Grand home">
            <BrundavanLogo className="h-8 max-w-[170px] sm:h-9 sm:max-w-[205px]" />
          </NavLink>
          <div className="flex shrink-0 items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {NAV.map(({ to, label, icon: Icon, end, primary }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    primary
                      ? 'bg-primary text-primary-foreground hover:bg-brand-900'
                      : isActive(to, end)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-secondary',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </NavLink>
              ))}
            </nav>
            <SyncBadge />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-3 pb-28 md:pb-10">
        <Outlet />
      </main>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-5xl items-stretch justify-around px-1">
          {NAV.map(({ to, label, icon: Icon, end, primary }) =>
            primary ? (
              <li key={to} className="flex flex-1 items-center justify-center">
                <NavLink
                  to={to}
                  aria-label="Add daily sales"
                  className="-mt-6 flex size-15 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-raise transition active:scale-95"
                >
                  <PlusIcon className="size-7" strokeWidth={2.75} aria-hidden />
                </NavLink>
              </li>
            ) : (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[0.68rem] font-medium transition-colors',
                    isActive(to, end) ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>

      <footer className="hidden border-t border-border px-4 py-5 text-center text-xs text-muted-foreground md:block">
        {HOTEL.name} · {HOTEL.city}
      </footer>
    </div>
  )
}
