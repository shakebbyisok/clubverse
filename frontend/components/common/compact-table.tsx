'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface CompactTableColumn<T> {
  key: string
  header: string
  cell?: (row: T) => ReactNode
  className?: string
  width?: string
}

interface CompactTableProps<T> {
  data: T[]
  columns: CompactTableColumn<T>[]
  keyExtractor: (row: T) => string
  emptyMessage?: string
  className?: string
  selectable?: boolean
  selectedRows?: Set<string>
  onRowSelect?: (rowId: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  onRowClick?: (row: T) => void
}

export function CompactTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  className,
  selectable = false,
  selectedRows = new Set(),
  onRowSelect,
  onSelectAll,
  onRowClick,
}: CompactTableProps<T>) {
  const allSelected = data.length > 0 && data.every(row => selectedRows.has(keyExtractor(row)))
  const someSelected = data.some(row => selectedRows.has(keyExtractor(row)))

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border/40 overflow-hidden bg-card/50', className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/40 h-auto">
              {selectable && (
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      onSelectAll?.(!!checked)
                    }}
                    className="h-3.5 w-3.5"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider',
                    column.className
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const rowId = keyExtractor(row)
              const isSelected = selectedRows.has(rowId)
              return (
                <TableRow
                  key={rowId}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border/20 hover:bg-accent/30 transition-colors',
                    'h-auto',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'bg-accent/20'
                  )}
                >
                  {selectable && (
                    <TableCell className="px-3 py-1.5">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          onRowSelect?.(rowId, !!checked)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn('px-3 py-1.5 text-sm', column.className)}
                    >
                      {column.cell ? column.cell(row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

