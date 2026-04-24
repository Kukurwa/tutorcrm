'use client';

import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';

import { Button } from './button';

export interface SortableListItem {
  id: string;
}

export interface SortableListProps<T extends SortableListItem> {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SortableList<T extends SortableListItem>({
  items,
  onReorder,
  renderItem,
  className,
  disabled,
}: SortableListProps<T>) {
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onReorder(next);
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-2 rounded-md border bg-card p-3 shadow-sm"
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
              aria-label="Выше"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || index === items.length - 1}
              onClick={() => move(index, 1)}
              aria-label="Ниже"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
