import { RecipesTable } from '@/components/RecipesTable'
import { Button } from '@/components/ui/button'
import { useRecipesList } from '@/hooks/use-recipes-list'

export function Recipes() {
  const { items, isLoading, error, refetch } = useRecipesList()

  const renderBody = () => {
    if (isLoading) return <RecipesTableSkeleton />
    if (error) {
      return (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4"
        >
          <p className="text-sm text-destructive">
            Couldn't load your recipes. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <p className="text-muted-foreground">
          You haven't added any recipes yet.
        </p>
      )
    }
    return <RecipesTable rows={items} />
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-10 flex flex-col gap-6">
        <h1 className="text-3xl font-semibold">My recipes</h1>
        {renderBody()}
      </div>
    </main>
  )
}

function RecipesTableSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading recipes" role="status">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 rounded-md bg-muted/60 animate-pulse" />
      ))}
    </div>
  )
}
