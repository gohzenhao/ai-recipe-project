import { Link, useParams } from 'react-router'

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Recipe #{id}</h1>
        <p className="text-muted-foreground">Recipe detail coming soon.</p>
        <Link to="/recipes" className="underline text-sm">
          Back to recipes
        </Link>
      </div>
    </main>
  )
}
