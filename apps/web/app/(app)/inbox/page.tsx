import { requireRole } from '@/lib/auth/session';

import { InboxWorkspace } from './inbox-workspace';

export const metadata = { title: 'Inbox — TutorCRM' };

export default async function InboxPage() {
  await requireRole('admin', 'dispatcher');

  return (
    <div className="-m-3 h-[calc(100vh-56px)] sm:-m-4 md:-m-6">
      <InboxWorkspace />
    </div>
  );
}
