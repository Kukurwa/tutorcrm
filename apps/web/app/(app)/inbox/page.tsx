import { requireRole } from '@/lib/auth/session';
import { funnelStagesStore, inboxFoldersStore, scriptsStore, subjectsStore } from '@/mocks/store';

import { InboxWorkspace } from './inbox-workspace';

export const metadata = { title: 'Входящие — TutorCRM' };

export default async function InboxPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [subjects, stages, scripts, allFolders] = await Promise.all([
    subjectsStore.list(),
    funnelStagesStore.list(),
    scriptsStore.list(),
    inboxFoldersStore.list(),
  ]);
  const folders =
    session.user.role === 'admin'
      ? allFolders
      : allFolders.filter((f) => f.ownerId === session.user.id);

  return (
    <div className="-m-3 h-[calc(100vh-56px)] sm:-m-4 md:-m-6">
      <InboxWorkspace
        subjects={subjects.filter((s) => s.active)}
        stages={stages.sort((a, b) => a.order - b.order)}
        scripts={scripts}
        initialFolders={folders}
      />
    </div>
  );
}
