'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';

import type { Role } from '@tutorcrm/contracts';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@tutorcrm/ui';

import { SidebarBrand, SidebarNav } from './sidebar-nav';

export function MobileSidebar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Открыть меню">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="bg-card text-card-foreground dark flex w-64 flex-col p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Навигация</SheetTitle>
          <SheetDescription>Основное меню TutorCRM</SheetDescription>
        </SheetHeader>
        <SidebarBrand onNavigate={() => setOpen(false)} />
        <SidebarNav role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
