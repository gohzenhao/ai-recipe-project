import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { fetchMe } from '@/lib/auth'
import { Home } from '@/routes/Home'
import { Login } from '@/routes/Login'
import { Signup } from '@/routes/Signup'

export function App() {
  useEffect(() => {
    // Cold-load /me probe: resolves the auth-store out of 'loading' and
    // seeds the csrftoken cookie via @ensure_csrf_cookie on the backend.
    void fetchMe()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
