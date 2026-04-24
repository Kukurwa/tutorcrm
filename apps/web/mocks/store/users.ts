import type { User } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const seed: User[] = [
  {
    id: 'user_admin',
    email: 'admin@tutorcrm.local',
    name: 'Админ Демо',
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_dispatcher',
    email: 'dispatcher@tutorcrm.local',
    name: 'Диспетчер Демо',
    role: 'dispatcher',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user_leadgen',
    email: 'leadgen@tutorcrm.local',
    name: 'LeadGen Демо',
    role: 'leadgen',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
];

export const usersStore = new MockCollection<User>('users', seed);
