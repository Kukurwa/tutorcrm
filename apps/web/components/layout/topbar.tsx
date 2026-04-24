'use client';

import { LogOut, UserCog } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  RoleBadge,
  type Role,
} from '@tutorcrm/ui';

import { MobileSidebar } from './mobile-sidebar';
import { NotificationBell } from './notification-bell';

export interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="bg-background flex h-14 items-center justify-between border-b px-3 sm:px-4">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <MobileSidebar role={user.role} />
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <div className="text-sm font-medium leading-tight">{user.name}</div>
                <div className="text-muted-foreground text-xs">{user.email}</div>
              </div>
              <RoleBadge role={user.role} className="hidden md:inline-flex" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCog className="h-4 w-4" /> Профиль
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void signOut({
                  callbackUrl: `${window.location.origin}/login`,
                });
              }}
            >
              <LogOut className="h-4 w-4" /> Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
