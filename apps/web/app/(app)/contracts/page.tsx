import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { contractsStore, subjectsStore, tutorsStore, usersStore } from '@/mocks/store';

import { ContractsList } from './contracts-list';

export const metadata = { title: 'Контракты — TutorCRM' };

export default async function ContractsPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [contracts, tutors, subjects, users] = await Promise.all([
    contractsStore.list(),
    tutorsStore.list(),
    subjectsStore.list(),
    usersStore.list(),
  ]);

  let rows = contracts;
  if (session.user.role === 'dispatcher') {
    rows = rows.filter((c) => c.dispatcherId === session.user.id);
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const dispatchers = users
    .filter((u) => u.role === 'dispatcher' && u.status === 'active')
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Контракты"
        description="Учет учеников по предметам и диспетчерам. Клик по строке — отдельная страница ученика."
      />
      <ContractsList
        initial={rows}
        tutors={tutors.filter((t) => t.status === 'active')}
        subjects={subjects.filter((s) => s.active)}
        dispatchers={dispatchers}
        canFilterByDispatcher={session.user.role === 'admin'}
      />
    </div>
  );
}
