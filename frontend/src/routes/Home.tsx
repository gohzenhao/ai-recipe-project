import { useAuthStore } from '@/lib/auth-store'

export function Home() {
  const user = useAuthStore((state) => state.user)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-semibold">Home</h1>
      {user && (
        <p className="text-lg">
          Signed in as <span className="font-medium">{user.display_name}</span>
        </p>
      )}
    </main>
  )
}
