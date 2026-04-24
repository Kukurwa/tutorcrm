import type { Notification } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

const seed: Notification[] = [
  {
    id: 'ntf_1',
    userId: 'user_dispatcher',
    category: 'inbox',
    title: 'Новое сообщение от Наталя Шевченко',
    body: 'Здравствуйте, интересует английский',
    link: '/inbox',
    read: false,
    createdAt: minsAgo(2),
  },
  {
    id: 'ntf_2',
    userId: 'user_dispatcher',
    category: 'sla',
    title: 'SLA: нет ответа в новом диалоге 15 мин',
    body: 'dlg_3, Наталя',
    link: '/inbox',
    read: false,
    createdAt: minsAgo(1),
  },
  {
    id: 'ntf_3',
    userId: 'user_dispatcher',
    category: 'responses',
    title: 'Новый отклик на заявку',
    body: 'Оксана Іваненко — заявка req_1',
    link: '/requests',
    read: true,
    createdAt: minsAgo(60 * 8),
  },
];

export const notificationsStore = new MockCollection<Notification>('notifications', seed);
