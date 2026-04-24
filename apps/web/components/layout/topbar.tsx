'use client';

import { LogOut, Moon, Sun, UserCog } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import {
  Avatar,
  AvatarFallback,
  Button,
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
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-3 sm:px-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MobileSidebar role={user.role} />
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Переключить тему"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          suppressHydrationWarning
        >
          {!mounted ? (
            <span className="h-4 w-4" />
          ) : resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <div className="text-sm font-medium leading-tight">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
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
