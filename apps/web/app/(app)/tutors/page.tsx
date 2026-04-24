import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { subjectsStore, tutorsStore } from '@/mocks/store';

import { TutorsList } from './tutors-list';

export const metadata = { title: 'Репетиторы — TutorCRM' };

export default async function TutorsPage() {
  await requireRole('admin', 'dispatcher');

  const [tutors, subjects] = await Promise.all([tutorsStore.list(), subjectsStore.list()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Репетиторы" description="База репетиторов по предметам." />
      <TutorsList
        initial={tutors.sort((a, b) => a.name.localeCompare(b.name))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
