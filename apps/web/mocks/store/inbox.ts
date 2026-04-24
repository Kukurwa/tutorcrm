import type { Dialog, Message } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

const dialogs: Dialog[] = [
  {
    id: 'dlg_1',
    channel: 'telegram',
    externalId: 'tg_chat_1001',
    clientId: 'cli_1',
    clientName: 'Ольга Ковальчук',
    dispatcherId: 'user_dispatcher',
    stage: 'request_created',
    leadId: 'lead_1',
    requestId: null,
    unread: 0,
    lastMessagePreview: 'Спасибо! Жду вашего предложения.',
    lastMessageAt: minsAgo(25),
    slaDueAt: null,
    createdAt: hoursAgo(48),
    updatedAt: minsAgo(25),
  },
  {
    id: 'dlg_2',
    channel: 'whatsapp',
    externalId: 'wa_380932223344',
    clientId: 'cli_2',
    clientName: 'Дмитро Зайцев',
    dispatcherId: 'user_dispatcher',
    stage: 'lead_created',
    leadId: 'lead_2',
    requestId: null,
    unread: 2,
    lastMessagePreview: 'А можно на выходных?',
    lastMessageAt: minsAgo(7),
    slaDueAt: new Date(now.getTime() + 55 * 60_000).toISOString(),
    createdAt: hoursAgo(24),
    updatedAt: minsAgo(7),
  },
  {
    id: 'dlg_3',
    channel: 'telegram',
    externalId: 'tg_chat_1003',
    clientId: 'cli_3',
    clientName: 'Наталя Шевченко',
    dispatcherId: null,
    stage: 'new_dialog',
    leadId: null,
    requestId: null,
    unread: 1,
    lastMessagePreview: 'Здравствуйте, интересует английский',
    lastMessageAt: minsAgo(2),
    slaDueAt: new Date(now.getTime() + 13 * 60_000).toISOString(),
    createdAt: minsAgo(3),
    updatedAt: minsAgo(2),
  },
];

const messages: Message[] = [
  // dlg_1
  {
    id: 'msg_1_1',
    dialogId: 'dlg_1',
    direction: 'in',
    text: 'Добрый день! Ищу репетитора по украинскому для 11 класса.',
    authorName: 'Ольга Ковальчук',
    sentAt: hoursAgo(48),
    read: true,
  },
  {
    id: 'msg_1_2',
    dialogId: 'dlg_1',
    direction: 'out',
    text: 'Здравствуйте, Ольга! Я Диспетчер, подберём. Какой уровень, цель?',
    authorName: 'Диспетчер Демо',
    sentAt: hoursAgo(47),
    read: true,
  },
  {
    id: 'msg_1_3',
    dialogId: 'dlg_1',
    direction: 'in',
    text: 'Дочь на 190+ хочет сдать ЗНО. Сейчас 170.',
    authorName: 'Ольга Ковальчук',
    sentAt: hoursAgo(46),
    read: true,
  },
  {
    id: 'msg_1_4',
    dialogId: 'dlg_1',
    direction: 'out',
    text: 'Поняла. Уточню расписание и предложу 1–2 репетиторов.',
    authorName: 'Диспетчер Демо',
    sentAt: hoursAgo(23),
    read: true,
  },
  {
    id: 'msg_1_5',
    dialogId: 'dlg_1',
    direction: 'in',
    text: 'Спасибо! Жду вашего предложения.',
    authorName: 'Ольга Ковальчук',
    sentAt: minsAgo(25),
    read: true,
  },
  // dlg_2
  {
    id: 'msg_2_1',
    dialogId: 'dlg_2',
    direction: 'in',
    text: 'Привет, нужна разовая консультация по математике, 10 класс.',
    authorName: 'Дмитро Зайцев',
    sentAt: hoursAgo(24),
    read: true,
  },
  {
    id: 'msg_2_2',
    dialogId: 'dlg_2',
    direction: 'out',
    text: 'Здравствуйте! Когда удобно? Сколько по времени?',
    authorName: 'Диспетчер Демо',
    sentAt: hoursAgo(22),
    read: true,
  },
  {
    id: 'msg_2_3',
    dialogId: 'dlg_2',
    direction: 'in',
    text: 'Часа на 2, до экзамена осталось 5 дней.',
    authorName: 'Дмитро Зайцев',
    sentAt: minsAgo(15),
    read: false,
  },
  {
    id: 'msg_2_4',
    dialogId: 'dlg_2',
    direction: 'in',
    text: 'А можно на выходных?',
    authorName: 'Дмитро Зайцев',
    sentAt: minsAgo(7),
    read: false,
  },
  // dlg_3
  {
    id: 'msg_3_1',
    dialogId: 'dlg_3',
    direction: 'in',
    text: 'Здравствуйте, интересует английский',
    authorName: 'Наталя Шевченко',
    sentAt: minsAgo(2),
    read: false,
  },
];

export const dialogsStore = new MockCollection<Dialog>('dialogs', dialogs);
export const messagesStore = new MockCollection<Message>('messages', messages);
