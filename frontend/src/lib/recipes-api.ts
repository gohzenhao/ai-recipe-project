import { apiFetch } from '@/lib/api-client'

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

export function fetchRecipesPage(): Promise<RecipeListPage> {
  return apiFetch<RecipeListPage>('/recipes/', { method: 'GET' })
}
