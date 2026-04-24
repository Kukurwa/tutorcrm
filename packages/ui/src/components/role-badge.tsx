import * as React from 'react';

import { cn } from '../lib/cn';

export type Role = 'admin' | 'dispatcher' | 'leadgen';

const LABELS: Record<Role, string> = {
  admin: 'Admin',
  dispatcher: 'Dispatcher',
  leadgen: 'LeadGen',
};

const STYLES: Record<Role, string> = {
  admin: 'bg-primary text-primary-foreground',
  dispatcher: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  leadgen: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
};

export interface RoleBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  role: Role;
}

export function RoleBadge({ role, className, ...props }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[role],
        className,
      )}
      {...props}
    >
      {LABELS[role]}
    </span>
  );
}
