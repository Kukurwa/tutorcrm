import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  funnelStagesStore,
  rejectionReasonsStore,
  requestsStore,
  tutorsStore,
  usersStore,
} from '@/mocks/store';

import { FunnelBoard } from './funnel-board';

export const metadata = { title: 'Воронка — TutorCRM' };

export default async function FunnelPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [requests, stages, reasons, tutors, users] = await Promise.all([
    requestsStore.list(),
    funnelStagesStore.list(),
    rejectionReasonsStore.list(),
    tutorsStore.list(),
    usersStore.list(),
  ]);

  let rows = requests;
  if (session.user.role === 'dispatcher') {
    rows = rows.filter((r) => r.dispatcherId === session.user.id);
  }

  const dispatchers = users
    .filter((u) => u.role === 'dispatcher' && u.status === 'active')
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Воронка"
        description="Kanban-доска. DnD только по разрешённым переходам. Закрытие в отказ — с обязательной причиной."
      />
      <FunnelBoard
        initial={rows}
        stages={stages.sort((a, b) => a.order - b.order)}
        reasons={reasons.filter((r) => r.active)}
        tutors={tutors.filter((t) => t.status === 'active')}
        dispatchers={dispatchers}
        canFilterByDispatcher={session.user.role === 'admin'}
      />
    </div>
  );
}
