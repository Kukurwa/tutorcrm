import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  clientsStore,
  funnelStagesStore,
  rejectionReasonsStore,
  requestsStore,
  subjectsStore,
  tutorsStore,
} from '@/mocks/store';

import { RequestsList } from './requests-list';

export const metadata = { title: 'Заявки — TutorCRM' };

export default async function RequestsPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [requests, stages, reasons, subjects, tutors, clients] = await Promise.all([
    requestsStore.list(),
    funnelStagesStore.list(),
    rejectionReasonsStore.list(),
    subjectsStore.list(),
    tutorsStore.list(),
    clientsStore.list(),
  ]);

  let rows = requests;
  if (session.user.role === 'dispatcher') {
    rows = rows.filter((r) => r.dispatcherId === session.user.id);
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Заявки" description="Таблица всех заявок, фильтры по стадии и клиенту." />
      <RequestsList
        initial={rows}
        stages={stages.sort((a, b) => a.order - b.order)}
        reasons={reasons.filter((r) => r.active)}
        subjects={subjects.filter((s) => s.active)}
        tutors={tutors.filter((t) => t.status === 'active')}
        clients={clients.map((c) => ({ id: c.id, name: c.name, dispatcherId: c.dispatcherId }))}
      />
    </div>
  );
}
