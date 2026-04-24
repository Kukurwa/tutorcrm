import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { leadsStore, usersStore } from '@/mocks/store';

import { LeadGenWorkspace } from './leadgen-workspace';

export const metadata = { title: 'Лидогенерация — TutorCRM' };

export default async function LeadGenPage() {
  const session = await requireRole('admin', 'leadgen');

  let leads = await leadsStore.list();
  if (session.user.role === 'leadgen') {
    leads = leads.filter((l) => l.createdBy === session.user.id);
  }
  leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const users = await usersStore.list();
  const dispatchers = users.filter((u) => u.role === 'dispatcher');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Лидогенерация"
        description="Создание новых лидов и отслеживание их судьбы."
      />
      <LeadGenWorkspace
        initial={leads}
        dispatchers={dispatchers.map((d) => ({ id: d.id, name: d.name }))}
        role={session.user.role}
      />
    </div>
  );
}
