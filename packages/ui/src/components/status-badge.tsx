import * as React from 'react';

import { cn } from '../lib/cn';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-destructive/15 text-destructive',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  label: string;
}

export function StatusBadge({ tone = 'neutral', label, className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full bg-current opacity-80')}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
