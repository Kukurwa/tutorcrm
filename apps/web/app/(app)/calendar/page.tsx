import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { calendarEventsStore } from '@/mocks/store';

import { CalendarView } from './calendar-view';

export const metadata = { title: 'Календарь — TutorCRM' };

export default async function CalendarPage() {
  await requireRole('admin', 'dispatcher');

  const events = await calendarEventsStore.list();
  events.sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Календарь" description="Пробные и регулярные занятия." />
      <CalendarView initial={events} />
    </div>
  );
}
