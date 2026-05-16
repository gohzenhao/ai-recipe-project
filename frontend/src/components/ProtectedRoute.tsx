import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/lib/auth-store'

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)
  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <span className="text-muted-foreground">Loading…</span>
      </main>
    )
  }
  if (status === 'anon') {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
