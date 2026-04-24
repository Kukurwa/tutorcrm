import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { clientContactsStore, clientsStore, usersStore } from '@/mocks/store';

import { ClientsList } from './clients-list';

export const metadata = { title: 'Клиенты — TutorCRM' };

export default async function ClientsPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [clients, contacts, users] = await Promise.all([
    clientsStore.list(),
    clientContactsStore.list(),
    usersStore.list(),
  ]);

  let rows = clients;
  if (session.user.role === 'dispatcher') {
    rows = rows.filter((c) => c.dispatcherId === session.user.id);
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const dispatchers = users.filter((u) => u.role === 'dispatcher');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Клиенты"
        description="Для dispatcher — только свои клиенты. Admin видит всех."
      />
      <ClientsList
        initial={rows.map((c) => ({
          ...c,
          contacts: contacts.filter((x) => x.clientId === c.id),
        }))}
        dispatchers={dispatchers.map((d) => ({ id: d.id, name: d.name }))}
        role={session.user.role}
      />
    </div>
  );
}
