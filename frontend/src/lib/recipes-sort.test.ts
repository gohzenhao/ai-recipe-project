import { describe, expect, it } from 'vitest'
import { cycleSort } from '@/lib/recipes-sort'

describe('cycleSort', () => {
  describe('title column', () => {
    it('goes from default (-updated_at) to asc on first click', () => {
      expect(cycleSort('-updated_at', 'title')).toBe('title')
    })

    it('goes from asc to desc on second click', () => {
      expect(cycleSort('title', 'title')).toBe('-title')
    })

    it('clears to default (-updated_at) on third click', () => {
      expect(cycleSort('-title', 'title')).toBe('-updated_at')
    })
  })

  describe('updated_at column', () => {
    it('goes from default (-updated_at) to asc on first click', () => {
      // From default, sort is -updated_at; clicking updated_at should
      // surface ascending order.
      expect(cycleSort('-updated_at', 'updated_at')).toBe('updated_at')
    })

    it('goes from asc back to desc (which is the default)', () => {
      expect(cycleSort('updated_at', 'updated_at')).toBe('-updated_at')
    })
  })

  it('switches to a different column when called from an unrelated active sort', () => {
    expect(cycleSort('title', 'updated_at')).toBe('updated_at')
    expect(cycleSort('-updated_at', 'title')).toBe('title')
  })
})
