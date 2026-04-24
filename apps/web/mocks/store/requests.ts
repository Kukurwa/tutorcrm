import type { Request, RequestResponse, Trial } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const requests: Request[] = [
  {
    id: 'req_1',
    clientId: 'cli_1',
    clientName: 'Ольга Ковальчук',
    subjectId: 'subj_ukr',
    subjectName: 'Украинский язык',
    dealType: 'contract',
    description: 'Подготовка к ЗНО, 11 класс. Цель 190+. Занятия 2-3 раза в неделю.',
    budgetFrom: 400,
    budgetTo: 600,
    schedule: 'Будни 18:00–20:00, иногда выходные',
    stage: 'searching_tutor',
    dispatcherId: 'user_dispatcher',
    publishedChannels: ['@tutors_ukr_contracts'],
    publishedAt: hoursAgo(10),
    assignedTutorId: null,
    rejectionReasonId: null,
    createdAt: hoursAgo(40),
    updatedAt: hoursAgo(10),
  },
  {
    id: 'req_2',
    clientId: 'cli_2',
    clientName: 'Дмитро Зайцев',
    subjectId: 'subj_math',
    subjectName: 'Математика',
    dealType: 'one_time',
    description: 'Разовая консультация, 2 часа. 10 класс, до экзамена 5 дней.',
    budgetFrom: 500,
    budgetTo: 1000,
    schedule: 'В эту субботу утром',
    stage: 'request_created',
    dispatcherId: 'user_dispatcher',
    publishedChannels: [],
    publishedAt: null,
    assignedTutorId: null,
    rejectionReasonId: null,
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(6),
  },
  {
    id: 'req_3',
    clientId: 'cli_3',
    clientName: 'Наталя Шевченко',
    subjectId: 'subj_english',
    subjectName: 'Английский',
    dealType: 'contract',
    description: 'Английский для взрослых, разговорный уровень B1.',
    budgetFrom: 300,
    budgetTo: 500,
    schedule: 'Вечером 2-3 раза в неделю',
    stage: 'active',
    dispatcherId: 'user_dispatcher',
    publishedChannels: ['@tutors_english_contracts'],
    publishedAt: hoursAgo(24 * 7),
    assignedTutorId: 'tut_2',
    rejectionReasonId: null,
    createdAt: hoursAgo(24 * 10),
    updatedAt: hoursAgo(24 * 3),
  },
];

const responses: RequestResponse[] = [
  {
    id: 'resp_1',
    requestId: 'req_1',
    tutorId: 'tut_3',
    tutorName: 'Оксана Іваненко',
    note: 'Готова, есть опыт ЗНО.',
    status: 'new',
    createdAt: hoursAgo(8),
  },
  {
    id: 'resp_2',
    requestId: 'req_1',
    tutorId: 'tut_1',
    tutorName: 'Анна Мельник',
    note: 'Не мой профиль, не возьмусь.',
    status: 'declined',
    createdAt: hoursAgo(7),
  },
];

const trials: Trial[] = [];

export const requestsStore = new MockCollection<Request>('requests', requests);
export const requestResponsesStore = new MockCollection<RequestResponse>(
  'request_responses',
  responses,
);
export const trialsStore = new MockCollection<Trial>('trials', trials);
