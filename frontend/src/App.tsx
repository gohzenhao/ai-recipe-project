import { Navigate, Route, Routes } from 'react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Home } from '@/routes/Home'
import { Login } from '@/routes/Login'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
