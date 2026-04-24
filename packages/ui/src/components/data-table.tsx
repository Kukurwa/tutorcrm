import * as React from 'react';

import { cn } from '../lib/cn';

import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  skeletonRows = 5,
  emptyTitle = 'Нет данных',
  emptyDescription,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('rounded-md border overflow-x-auto', className)}>
        <table className="w-full min-w-[640px]">
          <thead className="border-b bg-muted/40">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className={cn('p-3', col.className)}>
                    <Skeleton className="h-4 w-full max-w-[180px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cn('rounded-md border', className)}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <table className="w-full">
        <thead className="border-b bg-muted/40">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'h-10 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  (col.align === 'left' || !col.align) && 'text-left',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              className={cn(
                'border-b transition-colors hover:bg-muted/30 last:border-b-0',
                onRowClick && 'cursor-pointer',
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-sm',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
