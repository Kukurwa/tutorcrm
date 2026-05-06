import type { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@tutorcrm/ui';

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { requireSession } from '@/lib/auth/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <SidebarProvider>
      <AppSidebar role={session.user.role} />
      <SidebarInset className="min-w-0">
        <AppHeader user={session.user} />
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
