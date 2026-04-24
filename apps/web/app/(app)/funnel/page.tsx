import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  funnelStagesStore,
  rejectionReasonsStore,
  requestsStore,
  tutorsStore,
} from '@/mocks/store';

import { FunnelBoard } from './funnel-board';

export const metadata = { title: 'Воронка — TutorCRM' };

export default async function FunnelPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [requests, stages, reasons, tutors] = await Promise.all([
    requestsStore.list(),
    funnelStagesStore.list(),
    rejectionReasonsStore.list(),
    tutorsStore.list(),
  ]);

  let rows = requests;
  if (session.user.role === 'dispatcher') {
    rows = rows.filter((r) => r.dispatcherId === session.user.id);
  }

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
      />
    </div>
  );
}
