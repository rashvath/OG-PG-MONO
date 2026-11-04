import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/helpers/utils'
import type { TableColumn } from '@/types/ui'

type PaginatedTableProps<T> = {
  title?: string
  columns: TableColumn<T>[]
  rows: T[]
  initialPageSize?: number
  pageSizeOptions?: number[]
  emptyMessage?: string
  className?: string
}

export function PaginatedTable<T extends { id?: string | number }>({
  title,
  columns,
  rows,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  emptyMessage = 'No records found.',
  className,
}: PaginatedTableProps<T>) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))

  const currentRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [page, pageSize, rows])

  const from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, rows.length)

  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : <div />}
        <label className="text-sm text-slate-700">
          Rows per page
          <select
            className="ml-2 rounded border border-slate-200 px-2 py-1"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              {columns.map((column) => (
                <th key={String(column.key)} className={cn('px-3 py-2 text-xs uppercase tracking-wide text-slate-500', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row, rowIndex) => (
                <tr key={String(row.id ?? rowIndex)} className="border-b border-slate-100">
                  {columns.map((column) => (
                    <td key={String(column.key)} className={cn('px-3 py-2 text-sm text-slate-700', column.className)}>
                      {column.cell ? column.cell(row) : String((row as Record<string, unknown>)[String(column.key)] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>{`Showing ${from}-${to} of ${rows.length}`}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
            Previous
          </Button>
          <span>{`Page ${page} of ${totalPages}`}</span>
          <Button variant="secondary" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      </div>
    </section>
  )
}
