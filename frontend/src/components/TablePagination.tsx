import { Button } from '@/components/ui/button'

export type TablePaginationProps = {
  page: number
  perPage: number
  total: number
  onPageChange: (next: number) => void
}

export function TablePagination({
  page,
  perPage,
  total,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const prevDisabled = page <= 1
  const nextDisabled = page * perPage >= total

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
