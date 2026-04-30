import { PageHeader, RoleBadge } from '@tutorcrm/ui';

import { requireSession } from '@/lib/auth/session';
import { leadsStore, subjectsStore, usersStore } from '@/mocks/store';

import { DashboardView } from './dashboard-view';
import { LeadgenView } from './leadgen-view';

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.user.role === 'leadgen') {
    const [leads, users] = await Promise.all([leadsStore.list(), usersStore.list()]);
    const myLeads = leads
      .filter((l) => l.createdBy === session.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const dispatchers = users
      .filter((u) => u.role === 'dispatcher' && u.status === 'active')
      .map((u) => ({ id: u.id, name: u.name }));
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Здравствуйте, ${session.user.name.split(' ')[0] ?? session.user.name}`}
          description="Создайте лид: только текст и контакт. Диспетчер — на ваш выбор или авто."
          actions={<RoleBadge role={session.user.role} />}
        />
        <LeadgenView initialLeads={myLeads} dispatchers={dispatchers} />
      </div>
    );
  }

  const [subjects, users] = await Promise.all([subjectsStore.list(), usersStore.list()]);
  const dispatchers = users
    .filter((u) => u.role === 'dispatcher')
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Здравствуйте, ${session.user.name.split(' ')[0] ?? session.user.name}`}
        description="Сводка, метрики и экспорт."
        actions={<RoleBadge role={session.user.role} />}
      />
      <DashboardView
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        dispatchers={dispatchers}
        showDispatcherFilter={session.user.role === 'admin'}
      />
    </div>
  );
}
