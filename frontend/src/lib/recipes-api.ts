import { apiFetch } from '@/lib/api-client'
import type { RecipeSort } from '@/lib/recipes-query'

export type RecipeListRow = {
  id: number
  title: string
  updated_at: string
}

export type RecipeListPage = {
  items: RecipeListRow[]
  total: number
  page: number
  per_page: number
}

export type FetchRecipesPageArgs = {
  sort: RecipeSort
  page: number
  perPage: number
}

export function fetchRecipesPage({
  sort,
  page,
  perPage,
}: FetchRecipesPageArgs): Promise<RecipeListPage> {
  const search = new URLSearchParams({
    sort,
    page: String(page),
    per_page: String(perPage),
  })
  return apiFetch<RecipeListPage>(`/recipes/?${search.toString()}`, {
    method: 'GET',
  })
}
