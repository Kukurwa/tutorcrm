import type { InboxFolder } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const folders: InboxFolder[] = [
  {
    id: 'fld_priority',
    name: 'Срочные',
    ownerId: 'user_dispatcher',
    color: '#ef4444',
    createdAt: now,
  },
];

export const inboxFoldersStore = new MockCollection<InboxFolder>('inbox_folders', folders);
