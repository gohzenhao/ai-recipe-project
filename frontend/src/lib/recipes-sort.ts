import { DEFAULT_RECIPE_SORT, type RecipeSort } from '@/lib/recipes-query'

export type SortableColumn = 'title' | 'updated_at'

export function cycleSort(current: RecipeSort, column: SortableColumn): RecipeSort {
  if (current === column) {
    return `-${column}` as RecipeSort
  }
  if (current === `-${column}`) {
    // Third click: clear to the global default. For the updated_at column
    // the default IS `-updated_at`, so the cycle effectively becomes
    // asc -> desc -> asc.
    return column === 'updated_at' ? column : DEFAULT_RECIPE_SORT
  }
  return column
}

export type SortDirection = 'asc' | 'desc' | null

export function sortDirectionFor(
  current: RecipeSort,
  column: SortableColumn,
): SortDirection {
  if (current === column) return 'asc'
  if (current === `-${column}`) return 'desc'
  return null
}
