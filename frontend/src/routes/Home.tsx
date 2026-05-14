import { useAuthStore } from '@/lib/auth-store'

export function Home() {
  const clearToken = useAuthStore((state) => state.clearToken)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-semibold">Home</h1>
      <button
        type="button"
        onClick={clearToken}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
      >
        Log out
      </button>
    </main>
  )
}
