import { useNavigate } from 'react-router'
import { logout } from '@/lib/auth'
import { useAuthStore } from '@/lib/auth-store'

export function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-semibold">Home</h1>
      {user && (
        <p className="text-lg">
          Signed in as <span className="font-medium">{user.display_name}</span>
        </p>
      )}
      <button
        type="button"
        onClick={() => void logout((path) => navigate(path))}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
      >
        Log out
      </button>
    </main>
  )
}
