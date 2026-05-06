import type { User } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const seed: User[] = [
  {
    id: 'user_admin',
    email: 'admin@tutorcrm.local',
    name: 'Семен Толкачов',
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher',
    email: 'dispatcher@tutorcrm.local',
    name: 'Наталя Ковальчук',
    role: 'dispatcher',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher_2',
    email: 'margo@tutorcrm.local',
    name: 'Маргарита Сидоренко',
    role: 'dispatcher',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher_3',
    email: 'irina@tutorcrm.local',
    name: 'Ірина Петренко',
    role: 'dispatcher',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher_4',
    email: 'olena@tutorcrm.local',
    name: 'Олена Шевченко',
    role: 'dispatcher',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_leadgen',
    email: 'leadgen@tutorcrm.local',
    name: 'Олександр Бондаренко',
    role: 'leadgen',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
];

export const usersStore = new MockCollection<User>('users', seed);
