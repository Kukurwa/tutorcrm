import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { contractsStore, tutorsStore } from '@/mocks/store';

import { ContractsList } from './contracts-list';

export const metadata = { title: 'Контракты — TutorCRM' };

export default async function ContractsPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [contracts, tutors] = await Promise.all([
    contractsStore.list(),
    tutorsStore.list(),
  ]);

  let rows = contracts;
  if (session.user.role === 'dispatcher') {
    rows = rows.filter((c) => c.dispatcherId === session.user.id);
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Контракты"
        description="Пауза, возобновление, замена репетитора, закрытие, еженедельный ввод уроков."
      />
      <ContractsList initial={rows} tutors={tutors.filter((t) => t.status === 'active')} />
    </div>
  );
}
