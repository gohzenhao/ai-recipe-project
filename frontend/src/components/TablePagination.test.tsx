import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TablePagination } from '@/components/TablePagination'

function setup(props: Partial<Parameters<typeof TablePagination>[0]> = {}) {
  const onPageChange = vi.fn()
  render(
    <TablePagination
      page={props.page ?? 1}
      perPage={props.perPage ?? 10}
      total={props.total ?? 25}
      onPageChange={props.onPageChange ?? onPageChange}
    />,
  )
  return { onPageChange }
}

describe('TablePagination', () => {
  it('renders "Page X of Y" computed from total / perPage', () => {
    setup({ page: 2, perPage: 10, total: 25 })
    expect(screen.getByText(/Page 2 of 3/i)).toBeInTheDocument()
  })

  it('shows "Page 1 of 1" when total is 0', () => {
    setup({ page: 1, perPage: 20, total: 0 })
    expect(screen.getByText(/Page 1 of 1/i)).toBeInTheDocument()
  })

  it('disables Prev on the first page', () => {
    setup({ page: 1, perPage: 10, total: 25 })
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('disables Next on the last page', () => {
    setup({ page: 3, perPage: 10, total: 25 })
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /prev/i })).not.toBeDisabled()
  })

  it('calls onPageChange with page+1 when Next is clicked', async () => {
    const { onPageChange } = setup({ page: 2, perPage: 10, total: 25 })
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with page-1 when Prev is clicked', async () => {
    const { onPageChange } = setup({ page: 2, perPage: 10, total: 25 })
    await userEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
