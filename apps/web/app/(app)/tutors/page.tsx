import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  contractsStore,
  requestsStore,
  subjectsStore,
  trialsStore,
  tutorsStore,
} from '@/mocks/store';

import { TutorsList, type TutorWithStats } from './tutors-list';

export const metadata = { title: 'Репетиторы — TutorCRM' };

export default async function TutorsPage() {
  await requireRole('admin', 'dispatcher');

  const [tutors, subjects, contracts, trials, requests] = await Promise.all([
    tutorsStore.list(),
    subjectsStore.list(),
    contractsStore.list(),
    trialsStore.list(),
    requestsStore.list(),
  ]);

  const rows: TutorWithStats[] = tutors
    .map((t) => {
      const contractsByTutor = contracts.filter((c) => c.tutorId === t.id);
      const activeContracts = contractsByTutor.filter((c) => c.status === 'active');
      const closedContracts = contractsByTutor.filter(
        (c) => c.status === 'closed_won' || c.status === 'closed_lost',
      );
      const trialsByTutor = trials.filter((tr) => tr.tutorId === t.id);
      const successTrials = trialsByTutor.filter((tr) => tr.result === 'success');
      const oneTimeGiven = requests.filter(
        (r) => r.assignedTutorId === t.id && r.dealType === 'one_time',
      );
      const successRate =
        trialsByTutor.length > 0
          ? Math.round((successTrials.length / trialsByTutor.length) * 100)
          : null;

      return {
        ...t,
        stats: {
          successTrials: successTrials.length,
          totalTrials: trialsByTutor.length,
          successRate,
          activeContracts: activeContracts.length,
          totalContracts: contractsByTutor.length,
          closedContracts: closedContracts.length,
          oneTimeGiven: oneTimeGiven.length,
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Репетиторы"
        description="База репетиторов и их эффективность: пробные, активные контракты, разовые заказы."
      />
      <TutorsList initial={rows} subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
