import { useNavigate } from 'react-router'
import { useAuthStore } from '@/lib/auth-store'

export function Login() {
  const setToken = useAuthStore((state) => state.setToken)
  const navigate = useNavigate()

  const handleSignIn = () => {
    setToken('stub-jwt-token')
    navigate('/', { replace: true })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-semibold">Login</h1>
      <button
        type="button"
        onClick={handleSignIn}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
      >
        Sign in (stub)
      </button>
    </main>
  )
}
