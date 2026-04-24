import type { Role } from '@tutorcrm/contracts';

import { SidebarBrand, SidebarNav } from './sidebar-nav';

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="border-border bg-card text-card-foreground dark hidden w-60 shrink-0 border-r lg:flex lg:flex-col">
      <SidebarBrand />
      <SidebarNav role={role} />
    </aside>
  );
}
