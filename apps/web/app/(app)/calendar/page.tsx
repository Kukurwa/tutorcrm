import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { calendarEventsStore, tasksStore } from '@/mocks/store';

import { CalendarView } from './calendar-view';

export const metadata = { title: 'Задачи и календарь — TutorCRM' };

export default async function CalendarPage() {
  const session = await requireRole('admin', 'dispatcher');

  const [events, tasksAll] = await Promise.all([calendarEventsStore.list(), tasksStore.list()]);

  const tasks =
    session.user.role === 'dispatcher'
      ? tasksAll.filter((t) => t.assignedToId === session.user.id || t.assignedToId === null)
      : tasksAll;

  return (
    <div className="space-y-6">
      <PageHeader title="Задачи" description="Управление задачами по проектам и периодам" />
      <CalendarView initialEvents={events} initialTasks={tasks} currentUserId={session.user.id} />
    </div>
  );
}
