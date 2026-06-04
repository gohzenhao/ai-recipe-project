export const RECIPE_SORT_VALUES = [
  'title',
  '-title',
  'updated_at',
  '-updated_at',
] as const

export type RecipeSort = (typeof RECIPE_SORT_VALUES)[number]

export const DEFAULT_RECIPE_SORT: RecipeSort = '-updated_at'
export const DEFAULT_RECIPE_PAGE = 1
export const DEFAULT_RECIPE_PER_PAGE = 20

export type RecipesListQuery = {
  sort: RecipeSort
  page: number
  perPage: number
}

function parseSort(raw: string | null): RecipeSort {
  if (raw === null) return DEFAULT_RECIPE_SORT
  return (RECIPE_SORT_VALUES as readonly string[]).includes(raw)
    ? (raw as RecipeSort)
    : DEFAULT_RECIPE_SORT
}

function parsePage(raw: string | null): number {
  if (raw === null) return DEFAULT_RECIPE_PAGE
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_RECIPE_PAGE
  return parsed
}

export function parseRecipesListQuery(
  searchParams: URLSearchParams,
): RecipesListQuery {
  return {
    sort: parseSort(searchParams.get('sort')),
    page: parsePage(searchParams.get('page')),
    perPage: DEFAULT_RECIPE_PER_PAGE,
  }
}
