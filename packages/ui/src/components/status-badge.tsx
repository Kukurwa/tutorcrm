import * as React from 'react';

import { cn } from '../lib/cn';
import { Badge } from './badge';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

// Цвет точки. Сам badge всегда нейтральный outline — это shadcn-pattern для статусов.
const DOT_COLOR: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  label: string;
}

export function StatusBadge({ tone = 'neutral', label, className, ...props }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-normal', className)} {...props}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLOR[tone])} aria-hidden="true" />
      {label}
    </Badge>
  );
}
