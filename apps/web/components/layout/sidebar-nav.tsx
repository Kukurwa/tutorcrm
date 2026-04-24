'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { Role } from '@tutorcrm/contracts';
import { cn } from '@tutorcrm/ui';

import { filterNavForRole } from '@/lib/navigation';

import { NavIcon } from './nav-icon';

interface Props {
  role: Role;
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({ role, onNavigate, className }: Props) {
  const pathname = usePathname();
  const items = filterNavForRole(role);

  return (
    <nav className={cn('flex-1 space-y-0.5 overflow-y-auto p-2', className)}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <NavIcon name={item.icon} className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-14 items-center border-b px-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 font-semibold"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
          T
        </span>
        TutorCRM
      </Link>
    </div>
  );
}
