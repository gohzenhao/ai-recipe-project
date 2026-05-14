import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/lib/auth-store'

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
