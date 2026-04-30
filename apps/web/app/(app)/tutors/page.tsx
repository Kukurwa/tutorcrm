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
  const session = await requireRole('admin', 'dispatcher');

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
      const closedWon = contractsByTutor.filter((c) => c.status === 'closed_won').length;
      const closedLost = contractsByTutor.filter((c) => c.status === 'closed_lost').length;
      const activeContracts = contractsByTutor.filter((c) => c.status === 'active').length;
      const requestsAssigned = requests.filter((r) => r.assignedTutorId === t.id);
      const trialsByTutor = trials.filter((tr) => tr.tutorId === t.id);

      // Эффективность = % выигранных контрактов от назначений
      const totalAssignments = requestsAssigned.length || contractsByTutor.length;
      const effectivenessRate = totalAssignments > 0 ? closedWon / totalAssignments : null;

      return {
        ...t,
        stats: {
          activeContracts,
          totalContracts: contractsByTutor.length,
          closedWon,
          closedLost,
          totalAssignments,
          effectivenessRate,
          totalTrials: trialsByTutor.length,
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Репетиторы"
        description="База репетиторов: контрактные и обычные условия, разделение по предметам, эффективность."
      />
      <TutorsList
        initial={rows}
        subjects={subjects
          .filter((s) => s.active)
          .map((s) => ({ id: s.id, name: s.name, code: s.code }))}
        currentUserId={session.user.id}
        requests={requests}
      />
    </div>
  );
}
