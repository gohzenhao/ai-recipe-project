import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { fetchMe } from '@/lib/auth'
import { Home } from '@/routes/Home'
import { Login } from '@/routes/Login'
import { Recipes } from '@/routes/Recipes'
import { RecipeDetail } from '@/routes/RecipeDetail'
import { Signup } from '@/routes/Signup'

// Module-scope so the cache survives across renders. A single client for the
// whole SPA is the recommended TanStack Query pattern.
const queryClient = new QueryClient()

export function App() {
  useEffect(() => {
    // Cold-load /me probe: resolves the auth-store out of 'loading' and
    // seeds the csrftoken cookie via @ensure_csrf_cookie on the backend.
    void fetchMe()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}
