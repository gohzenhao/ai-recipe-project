import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { RecipesTable } from '@/components/RecipesTable'
import type { RecipeListRow } from '@/lib/recipes-api'

const rows: RecipeListRow[] = [
  { id: 1, title: 'Pho', updated_at: '2026-01-02T00:00:00Z' },
]

function renderTable(props: { sort: Parameters<typeof RecipesTable>[0]['sort'] }) {
  const onSortChange = vi.fn()
  render(
    <MemoryRouter>
      <RecipesTable rows={rows} sort={props.sort} onSortChange={onSortChange} />
    </MemoryRouter>,
  )
  return { onSortChange }
}

describe('RecipesTable', () => {
  it('clicking the title header from the default sort emits "title"', async () => {
    const { onSortChange } = renderTable({ sort: '-updated_at' })
    await userEvent.click(screen.getByRole('button', { name: /title/i }))
    expect(onSortChange).toHaveBeenCalledWith('title')
  })

  it('clicking the title header while sort is "title" emits "-title"', async () => {
    const { onSortChange } = renderTable({ sort: 'title' })
    await userEvent.click(screen.getByRole('button', { name: /title/i }))
    expect(onSortChange).toHaveBeenCalledWith('-title')
  })

  it('clicking the title header while sort is "-title" emits the default "-updated_at"', async () => {
    const { onSortChange } = renderTable({ sort: '-title' })
    await userEvent.click(screen.getByRole('button', { name: /title/i }))
    expect(onSortChange).toHaveBeenCalledWith('-updated_at')
  })

  it('marks the active sort column with aria-sort and leaves the other untouched', () => {
    renderTable({ sort: '-title' })
    const titleHead = screen.getByRole('columnheader', { name: /title/i })
    const updatedHead = screen.getByRole('columnheader', { name: /last updated/i })
    expect(titleHead).toHaveAttribute('aria-sort', 'descending')
    expect(updatedHead).toHaveAttribute('aria-sort', 'none')
  })
})
