import { describe, expect, it } from 'vitest'
import { parseRecipesListQuery } from '@/lib/recipes-query'

function params(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input)
}

describe('parseRecipesListQuery', () => {
  it('returns defaults when the URL has no params', () => {
    expect(parseRecipesListQuery(params({}))).toEqual({
      sort: '-updated_at',
      page: 1,
      perPage: 20,
    })
  })

  it('accepts each of the four whitelisted sort values', () => {
    for (const sort of ['title', '-title', 'updated_at', '-updated_at']) {
      expect(parseRecipesListQuery(params({ sort })).sort).toBe(sort)
    }
  })

  it('falls back to the default sort when sort is outside the enum', () => {
    expect(parseRecipesListQuery(params({ sort: 'created_at' })).sort).toBe(
      '-updated_at',
    )
  })

  it('parses a valid page integer', () => {
    expect(parseRecipesListQuery(params({ page: '3' })).page).toBe(3)
  })

  it('falls back to page 1 for non-integer or out-of-range page values', () => {
    expect(parseRecipesListQuery(params({ page: '0' })).page).toBe(1)
    expect(parseRecipesListQuery(params({ page: '-2' })).page).toBe(1)
    expect(parseRecipesListQuery(params({ page: 'abc' })).page).toBe(1)
  })
})
