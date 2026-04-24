import type { Lead } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const leads: Lead[] = [
  {
    id: 'lead_1',
    clientName: 'Ольга Ковальчук',
    phone: '+380671234567',
    subject: 'ЗНО',
    note: 'Хочет подготовку к ЗНО.',
    status: 'converted',
    createdBy: 'user_leadgen',
    dispatcherId: 'user_dispatcher',
    clientId: 'cli_1',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'lead_2',
    clientName: 'Дмитро Зайцев',
    phone: '+380932223344',
    subject: 'Математика',
    note: 'Разовая консультация.',
    status: 'converted',
    createdBy: 'user_leadgen',
    dispatcherId: 'user_dispatcher',
    clientId: 'cli_2',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'lead_3',
    clientName: 'Наталя Шевченко',
    phone: '+380999887766',
    subject: 'Английский',
    note: null,
    status: 'new',
    createdBy: 'user_leadgen',
    dispatcherId: null,
    clientId: 'cli_3',
    createdAt: now,
    updatedAt: now,
  },
];

export const leadsStore = new MockCollection<Lead>('leads', leads);
