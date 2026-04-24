import type { CalendarEvent, Task } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date();
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

const tasks: Task[] = [
  {
    id: 'task_1',
    kind: 'feedback_after_trial',
    title: 'Нужен фидбек по пробному',
    note: 'Контракт con_1, клиент Наталя.',
    dueAt: hoursFromNow(6),
    assignedToId: 'user_dispatcher',
    status: 'open',
    snoozedUntil: null,
    relatedRequestId: 'req_3',
    relatedContractId: 'con_1',
    relatedDialogId: null,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },
  {
    id: 'task_2',
    kind: 'sla_new_dialog',
    title: 'Не ответили в новом диалоге за 15 мин',
    note: 'dlg_3, клиент Наталя.',
    dueAt: hoursFromNow(0.25),
    assignedToId: 'user_dispatcher',
    status: 'open',
    snoozedUntil: null,
    relatedRequestId: null,
    relatedContractId: null,
    relatedDialogId: 'dlg_3',
    createdAt: hoursAgo(0.25),
    updatedAt: hoursAgo(0.25),
  },
];

const events: CalendarEvent[] = [
  {
    id: 'cal_1',
    kind: 'regular_lesson',
    title: 'Английский — Наталя / Игорь',
    startAt: hoursFromNow(24),
    endAt: hoursFromNow(25),
    contractId: 'con_1',
    requestId: null,
    tutorId: 'tut_2',
    clientId: 'cli_3',
    note: null,
    createdAt: hoursAgo(24),
  },
  {
    id: 'cal_2',
    kind: 'trial',
    title: 'Пробный — математика, Дмитро',
    startAt: hoursFromNow(48),
    endAt: hoursFromNow(50),
    contractId: null,
    requestId: 'req_2',
    tutorId: null,
    clientId: 'cli_2',
    note: null,
    createdAt: hoursAgo(2),
  },
];

export const tasksStore = new MockCollection<Task>('tasks', tasks);
export const calendarEventsStore = new MockCollection<CalendarEvent>(
  'calendar_events',
  events,
);
