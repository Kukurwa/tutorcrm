import type { ReactNode } from 'react';

import { Card, CardContent, cn } from '@tutorcrm/ui';

export interface KpiStatProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  /** Цветовой акцент левой полосы. */
  accent?: 'neutral' | 'emerald' | 'sky' | 'violet' | 'amber' | 'rose';
  /** Стиль значения: subtle (одна строка) или hero (большая цифра). */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ACCENTS: Record<NonNullable<KpiStatProps['accent']>, string> = {
  neutral: 'before:bg-muted-foreground/30',
  emerald: 'before:bg-emerald-500',
  sky: 'before:bg-sky-500',
  violet: 'before:bg-violet-500',
  amber: 'before:bg-amber-500',
  rose: 'before:bg-rose-500',
};

const VALUE_SIZE: Record<NonNullable<KpiStatProps['size']>, string> = {
  sm: 'text-base font-semibold',
  md: 'text-xl font-semibold',
  lg: 'text-2xl font-bold',
};

export function KpiStat({
  label,
  value,
  hint,
  icon,
  accent = 'neutral',
  size = 'md',
  className,
}: KpiStatProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        ACCENTS[accent],
        className,
      )}
    >
      <CardContent className="flex items-center justify-between gap-3 py-4 pl-5">
        <div className="min-w-0">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
          <div className={cn('mt-0.5 tabular-nums', VALUE_SIZE[size])}>{value}</div>
          {hint ? <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div> : null}
        </div>
        {icon ? <div className="text-muted-foreground shrink-0">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
