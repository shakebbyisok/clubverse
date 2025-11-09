'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  cell?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string
  emptyMessage?: string
  className?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  className,
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border/40 overflow-hidden', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell ? column.cell(row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

