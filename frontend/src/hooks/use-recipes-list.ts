import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchRecipesPage, type RecipeListRow } from '@/lib/recipes-api'

export type UseRecipesListResult = {
  items: RecipeListRow[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
  isPlaceholderData: boolean
}

export function useRecipesList(): UseRecipesListResult {
  // Defaults-only in this slice — sort/page/per_page URL state lands in the
  // next slice. The query key carries those values explicitly so the cache
  // partitions correctly once they exist.
  const query = useQuery({
    queryKey: ['recipes', 'list', { sort: '-updated_at', page: 1, perPage: 20 }],
    queryFn: fetchRecipesPage,
    // `keepPreviousData` is what lets the next slice (URL-driven sort/page
    // changes) refetch without flashing the table blank.
    placeholderData: keepPreviousData,
  })

  const data = query.data
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    perPage: data?.per_page ?? 20,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch()
    },
    isPlaceholderData: query.isPlaceholderData,
  }
}
