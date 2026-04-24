import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { tasksStore } from '@/mocks/store';

import { TasksList } from './tasks-list';

export const metadata = { title: 'Задачи — TutorCRM' };

export default async function TasksPage() {
  const session = await requireRole('admin', 'dispatcher');
  let tasks = await tasksStore.list();
  if (session.user.role === 'dispatcher') {
    tasks = tasks.filter((t) => t.assignedToId === session.user.id || t.assignedToId === null);
  }
  tasks.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Задачи" description="Автоматические и ручные задачи." />
      <TasksList initial={tasks} />
    </div>
  );
}
