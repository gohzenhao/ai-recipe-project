import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { RecipeListRow } from '@/lib/recipes-api'
import type { RecipeSort } from '@/lib/recipes-query'
import {
  cycleSort,
  sortDirectionFor,
  type SortableColumn,
} from '@/lib/recipes-sort'

export type RecipesTableProps = {
  rows: RecipeListRow[]
  sort: RecipeSort
  onSortChange: (next: RecipeSort) => void
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

type SortableHeaderProps = {
  column: SortableColumn
  label: string
  sort: RecipeSort
  onSortChange: (next: RecipeSort) => void
  className?: string
}

function SortableHeader({
  column,
  label,
  sort,
  onSortChange,
  className,
}: SortableHeaderProps) {
  const direction = sortDirectionFor(sort, column)
  const ariaSort =
    direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'
  return (
    <TableHead aria-sort={ariaSort} className={className}>
      <button
        type="button"
        onClick={() => onSortChange(cycleSort(sort, column))}
        className={cn(
          'inline-flex items-center gap-1 -mx-1 px-1 py-0.5 rounded',
          'text-foreground font-medium',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span>{label}</span>
        {direction === 'asc' && (
          <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {direction === 'desc' && (
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        )}
      </button>
    </TableHead>
  )
}

export function RecipesTable({ rows, sort, onSortChange }: RecipesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader
            column="title"
            label="Title"
            sort={sort}
            onSortChange={onSortChange}
          />
          <SortableHeader
            column="updated_at"
            label="Last updated"
            sort={sort}
            onSortChange={onSortChange}
          />
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-foreground">{row.title}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatUpdatedAt(row.updated_at)}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link to={`/recipes/${row.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
