import * as React from 'react';

import { Badge } from './badge';

export type Role = 'admin' | 'dispatcher' | 'leadgen';

const LABELS: Record<Role, string> = {
  admin: 'Администратор',
  dispatcher: 'Диспетчер',
  leadgen: 'Лидген',
};

export interface RoleBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  role: Role;
}

export function RoleBadge({ role, className, ...props }: RoleBadgeProps) {
  return (
    <Badge variant={role === 'admin' ? 'default' : 'secondary'} className={className} {...props}>
      {LABELS[role]}
    </Badge>
  );
}
