import { useSearchParams } from 'react-router'
import { RecipesTable } from '@/components/RecipesTable'
import { TablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import { useRecipesList } from '@/hooks/use-recipes-list'
import {
  DEFAULT_RECIPE_PAGE,
  DEFAULT_RECIPE_SORT,
  type RecipeSort,
} from '@/lib/recipes-query'

export function Recipes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { items, total, page, perPage, sort, isLoading, error, refetch } =
    useRecipesList()

  // Mutate the URL through React Router so the address bar is the single
  // source of truth for sort/page. Drop params that match the defaults so
  // the URL stays clean (`/recipes` instead of `/recipes?sort=-updated_at&page=1`).
  const updateParams = (patch: { sort?: RecipeSort; page?: number }) => {
    const next = new URLSearchParams(searchParams)
    if (patch.sort !== undefined) {
      if (patch.sort === DEFAULT_RECIPE_SORT) next.delete('sort')
      else next.set('sort', patch.sort)
    }
    if (patch.page !== undefined) {
      if (patch.page === DEFAULT_RECIPE_PAGE) next.delete('page')
      else next.set('page', String(patch.page))
    }
    setSearchParams(next)
  }

  const handleSortChange = (nextSort: RecipeSort) => {
    // Changing sort resets the page so users don't land on an empty tail.
    updateParams({ sort: nextSort, page: DEFAULT_RECIPE_PAGE })
  }

  const handlePageChange = (nextPage: number) => {
    updateParams({ page: nextPage })
  }

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
    return (
      <div className="flex flex-col gap-4">
        <RecipesTable
          rows={items}
          sort={sort}
          onSortChange={handleSortChange}
        />
        <TablePagination
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={handlePageChange}
        />
      </div>
    )
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
