'use client';

import { useSession } from 'next-auth/react';
import type { ReactNode } from 'react';

import type { Role } from '@tutorcrm/contracts';

export interface RoleGuardProps {
  roles: Role[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const { data, status } = useSession();
  if (status !== 'authenticated') return <>{fallback}</>;
  if (!roles.includes(data.user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
