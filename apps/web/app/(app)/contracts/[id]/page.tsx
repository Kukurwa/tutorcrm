import { notFound } from 'next/navigation';

import { PageHeader, StatusBadge } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  contractEventsStore,
  contractsStore,
  lessonsStore,
  oneTimePaymentsStore,
  tutorsStore,
  weeklyLessonCountsStore,
} from '@/mocks/store';

import { ContractDetail } from './contract-detail';

interface Props {
  params: { id: string };
}

export default async function ContractPage({ params }: Props) {
  const session = await requireRole('admin', 'dispatcher');
  const contract = await contractsStore.findById(params.id);
  if (!contract) notFound();
  if (session.user.role === 'dispatcher' && contract.dispatcherId !== session.user.id) {
    notFound();
  }

  const [allEvents, weeklyAll, lessonsAll, allTutors, payments] = await Promise.all([
    contractEventsStore.list(),
    weeklyLessonCountsStore.list(),
    lessonsStore.list(),
    tutorsStore.list(),
    oneTimePaymentsStore.list(),
  ]);

  const events = allEvents
    .filter((e) => e.contractId === contract.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const weekly = weeklyAll
    .filter((w) => w.contractId === contract.id)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const lessons = lessonsAll
    .filter((l) => l.contractId === contract.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const contractPayments = payments.filter((p) => p.requestId === contract.requestId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="text-muted-foreground font-mono text-base">
              {contract.code ?? `#${contract.id.slice(-6)}`}
            </span>
            <span>{contract.studentName ?? contract.clientName}</span>
            <StatusBadge
              tone={
                contract.status === 'active'
                  ? 'success'
                  : contract.status === 'paused'
                    ? 'warning'
                    : 'neutral'
              }
              label={contract.status}
            />
          </span>
        }
        description={`${contract.subjectName ?? ''} · репетитор: ${contract.tutorName}`}
      />
      <ContractDetail
        contract={contract}
        events={events}
        weekly={weekly}
        lessons={lessons}
        tutors={allTutors.filter((t) => t.status === 'active')}
        payments={contractPayments}
      />
    </div>
  );
}
