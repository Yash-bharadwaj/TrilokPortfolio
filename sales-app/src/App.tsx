import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layouts/app-shell'
import { DashboardPage } from '@/pages/dashboard-page'
import { AddSalesPage } from '@/pages/add-sales-page'
import { HistoryPage } from '@/pages/history-page'
import { SettingsPage } from '@/pages/settings-page'
import { LoginPage } from '@/pages/login-page'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider, useAuth } from '@/providers/auth-provider'
import { SalesProvider } from '@/providers/sales-provider'
import { BrundavanEmblem } from '@/components/brand'

function Gate() {
  const { ready, userId } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <BrundavanEmblem className="h-14 w-auto animate-pulse" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (!userId) return <LoginPage />

  return (
    <SalesProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="add" element={<AddSalesPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SalesProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
      <Toaster />
    </AuthProvider>
  )
}
