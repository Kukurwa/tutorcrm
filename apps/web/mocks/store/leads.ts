import type { Lead } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const leads: Lead[] = [
  {
    id: 'lead_1',
    text: 'Нужна подготовка к ЗНО, дочь 11 класс. Цель 190+',
    contact: '+380671234567',
    clientName: 'Ольга Ковальчук',
    phone: '+380671234567',
    subject: 'ЗНО',
    note: 'Хочет подготовку к ЗНО.',
    status: 'converted',
    autoAssigned: false,
    createdBy: 'user_leadgen',
    dispatcherId: 'user_dispatcher',
    clientId: 'cli_1',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'lead_2',
    text: 'Разовая консультация по математике перед экзаменом, 10 класс',
    contact: '+380932223344',
    clientName: 'Дмитро Зайцев',
    phone: '+380932223344',
    subject: 'Математика',
    note: 'Разовая консультация.',
    status: 'converted',
    autoAssigned: true,
    createdBy: 'user_leadgen',
    dispatcherId: 'user_dispatcher',
    clientId: 'cli_2',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'lead_3',
    text: 'Английский B1, 2-3 раза в неделю',
    contact: '+380999887766',
    clientName: 'Наталя Шевченко',
    phone: '+380999887766',
    subject: 'Английский',
    note: null,
    status: 'new',
    autoAssigned: false,
    createdBy: 'user_leadgen',
    dispatcherId: null,
    clientId: 'cli_3',
    createdAt: now,
    updatedAt: now,
  },
];

export const leadsStore = new MockCollection<Lead>('leads', leads);
