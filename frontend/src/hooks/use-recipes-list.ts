import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { fetchRecipesPage, type RecipeListRow } from '@/lib/recipes-api'
import {
  parseRecipesListQuery,
  type RecipeSort,
} from '@/lib/recipes-query'

export type UseRecipesListResult = {
  items: RecipeListRow[]
  total: number
  page: number
  perPage: number
  sort: RecipeSort
  isLoading: boolean
  error: Error | null
  refetch: () => void
  isPlaceholderData: boolean
}

export function useRecipesList(): UseRecipesListResult {
  const [searchParams] = useSearchParams()
  const { sort, page, perPage } = parseRecipesListQuery(searchParams)

  const query = useQuery({
    queryKey: ['recipes', 'list', { sort, page, perPage }],
    queryFn: () => fetchRecipesPage({ sort, page, perPage }),
    // `keepPreviousData` keeps the rendered slice visible during refetch so
    // sort/page changes don't flash the table blank.
    placeholderData: keepPreviousData,
  })

  const data = query.data
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    perPage: data?.per_page ?? perPage,
    sort,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch()
    },
    isPlaceholderData: query.isPlaceholderData,
  }
}
