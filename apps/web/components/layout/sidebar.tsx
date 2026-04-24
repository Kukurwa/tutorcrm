import type { Role } from '@tutorcrm/contracts';

import { SidebarBrand, SidebarNav } from './sidebar-nav';

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <SidebarBrand />
      <SidebarNav role={role} />
    </aside>
  );
}
