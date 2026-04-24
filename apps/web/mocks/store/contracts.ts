import type {
  Contract,
  ContractEvent,
  OneTimeDealPayment,
  WeeklyLessonCount,
} from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

const contracts: Contract[] = [
  {
    id: 'con_1',
    requestId: 'req_3',
    clientId: 'cli_3',
    clientName: 'Наталя Шевченко',
    tutorId: 'tut_2',
    tutorName: 'Игорь Петренко',
    subjectId: 'subj_english',
    subjectName: 'Английский',
    hourlyRate: 450,
    commissionRate: 0.2,
    status: 'active',
    startedAt: daysAgo(14),
    pausedAt: null,
    closedAt: null,
    closeReason: null,
    dispatcherId: 'user_dispatcher',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(3),
  },
];

const events: ContractEvent[] = [
  {
    id: 'cev_1',
    contractId: 'con_1',
    kind: 'created',
    note: 'Контракт создан после успешного пробного.',
    createdAt: daysAgo(14),
  },
];

const weeklyCounts: WeeklyLessonCount[] = [
  {
    id: 'wlc_1',
    contractId: 'con_1',
    weekStart: isoDate(daysAgo(7)),
    count: 2,
    enteredAt: daysAgo(3),
    enteredBy: 'user_dispatcher',
  },
];

const payments: OneTimeDealPayment[] = [
  {
    id: 'otp_1',
    requestId: 'req_2',
    amount: 1400,
    status: 'pending',
    paidAt: null,
    note: 'Договорились на 1400 грн за 2 часа.',
    createdAt: now,
  },
];

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

export const contractsStore = new MockCollection<Contract>('contracts', contracts);
export const contractEventsStore = new MockCollection<ContractEvent>('contract_events', events);
export const weeklyLessonCountsStore = new MockCollection<WeeklyLessonCount>(
  'weekly_lesson_counts',
  weeklyCounts,
);
export const oneTimePaymentsStore = new MockCollection<OneTimeDealPayment>(
  'one_time_deal_payments',
  payments,
);
