import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  clientContactsStore,
  clientsStore,
  contractsStore,
  subjectsStore,
  usersStore,
} from '@/mocks/store';

import { ClientsList } from './clients-list';

export const metadata = { title: 'Клиенты — TutorCRM' };

export default async function ClientsPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [clients, contacts, users, contracts, subjects] = await Promise.all([
    clientsStore.list(),
    clientContactsStore.list(),
    usersStore.list(),
    contractsStore.list(),
    subjectsStore.list(),
  ]);

  let visibleClients = clients;
  let visibleContracts = contracts;
  if (session.user.role === 'dispatcher') {
    visibleClients = visibleClients.filter((c) => c.dispatcherId === session.user.id);
    visibleContracts = visibleContracts.filter((c) => c.dispatcherId === session.user.id);
  }

  const dispatchers = users
    .filter((u) => u.role === 'dispatcher')
    .map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Клиенты"
        description="Excel-таблица заказов клиентов с разбивкой по предметам. Каждая строка — отдельный заказ."
      />
      <ClientsList
        clients={visibleClients.map((c) => ({
          ...c,
          contacts: contacts.filter((x) => x.clientId === c.id),
        }))}
        contracts={visibleContracts}
        subjects={subjects.filter((s) => s.active)}
        dispatchers={dispatchers}
        role={session.user.role}
        canFilterByDispatcher={session.user.role === 'admin'}
      />
    </div>
  );
}
