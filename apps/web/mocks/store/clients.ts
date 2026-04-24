import type { Client, ClientContact } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const clients: Client[] = [
  {
    id: 'cli_1',
    name: 'Ольга Ковальчук',
    phone: '+380671234567',
    note: 'Хочет подготовку к ЗНО, дочь 11 класс.',
    createdBy: 'user_leadgen',
    dispatcherId: 'user_dispatcher',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cli_2',
    name: 'Дмитро Зайцев',
    phone: '+380932223344',
    note: 'Разовая консультация по математике.',
    createdBy: 'user_leadgen',
    dispatcherId: 'user_dispatcher',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cli_3',
    name: 'Наталя Шевченко',
    phone: '+380999887766',
    note: null,
    createdBy: 'user_leadgen',
    dispatcherId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const contacts: ClientContact[] = [
  { id: 'cc_1', clientId: 'cli_1', kind: 'phone', value: '+380671234567', primary: true },
  { id: 'cc_2', clientId: 'cli_1', kind: 'telegram', value: '@olga_kovalchuk', primary: false },
  { id: 'cc_3', clientId: 'cli_2', kind: 'phone', value: '+380932223344', primary: true },
  { id: 'cc_4', clientId: 'cli_3', kind: 'phone', value: '+380999887766', primary: true },
  { id: 'cc_5', clientId: 'cli_3', kind: 'viber', value: '+380999887766', primary: false },
];

export const clientsStore = new MockCollection<Client>('clients', clients);
export const clientContactsStore = new MockCollection<ClientContact>(
  'client_contacts',
  contacts,
);
