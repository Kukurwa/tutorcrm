import type { User } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const seed: User[] = [
  {
    id: 'user_admin',
    email: 'admin@tutorcrm.local',
    name: 'Семён Толкачёв',
    role: 'admin',
    status: 'active',
    hireDate: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher',
    email: 'dispatcher@tutorcrm.local',
    name: 'Наталья Ковальчук',
    role: 'dispatcher',
    status: 'active',
    hireDate: '2021-09-01',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher_2',
    email: 'margo@tutorcrm.local',
    name: 'Маргарита Сидоренко',
    role: 'dispatcher',
    status: 'active',
    hireDate: '2022-08-15',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher_3',
    email: 'irina@tutorcrm.local',
    name: 'Ирина Петренко',
    role: 'dispatcher',
    status: 'active',
    hireDate: '2024-04-10',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher_4',
    email: 'olena@tutorcrm.local',
    name: 'Елена Шевченко',
    role: 'dispatcher',
    status: 'active',
    hireDate: '2026-01-15',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_leadgen',
    email: 'leadgen@tutorcrm.local',
    name: 'Александр Бондаренко',
    role: 'leadgen',
    status: 'active',
    hireDate: '2025-03-01',
    createdAt: now,
    updatedAt: now,
  },
];

export const usersStore = new MockCollection<User>('users', seed);
