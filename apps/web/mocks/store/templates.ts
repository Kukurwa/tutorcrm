import type { MessageTemplate, Script } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

const now = new Date().toISOString();

const templates: MessageTemplate[] = [
  {
    id: 'tpl_greeting',
    kind: 'greeting',
    title: 'Приветствие',
    body: 'Здравствуйте, {{clientName}}! Я {{dispatcherName}}, помогу подобрать репетитора.',
    variables: ['clientName', 'dispatcherName'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_qualify',
    kind: 'qualify',
    title: 'Уточнение запроса',
    body: 'Расскажите, пожалуйста: предмет — {{subject}}, класс/уровень, цель занятий, удобное время.',
    variables: ['subject'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_assign_client',
    kind: 'assignment_client',
    title: 'Назначение клиенту',
    body: 'Нашли репетитора {{tutorName}} ({{tutorExperience}}). Контакт: {{tutorContact}}.',
    variables: ['tutorName', 'tutorExperience', 'tutorContact'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_assign_tutor',
    kind: 'assignment_tutor',
    title: 'Назначение репетитору',
    body: 'Клиент {{clientName}} ({{clientContact}}). Запрос: {{requestSummary}}.',
    variables: ['clientName', 'clientContact', 'requestSummary'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_feedback',
    kind: 'trial_feedback',
    title: 'Фидбек после пробного',
    body: 'Как прошёл пробный с {{tutorName}}? Устраивает ли продолжать занятия?',
    variables: ['tutorName'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_invoice',
    kind: 'invoice_reminder',
    title: 'Инвойс',
    body: 'Добрый день! Ваш счёт за занятия на этой неделе: {{amount}} {{currency}}. Срок оплаты: {{dueDate}}.',
    variables: ['amount', 'currency', 'dueDate'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

const scripts: Script[] = [
  {
    id: 'scr_new_dialog',
    title: 'Скрипт: новый диалог',
    body: '1. Поприветствовать.\n2. Узнать имя и цель.\n3. Предложить шаблон greeting.',
    stageKind: 'new_dialog',
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'scr_qualify',
    title: 'Скрипт: сбор брифа',
    body: '1. Предмет, уровень.\n2. Цель (подтянуть / ЗНО / экзамен).\n3. Формат и время.',
    stageKind: 'lead_created',
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'scr_search',
    title: 'Скрипт: поиск репетитора',
    body: '1. Опубликовать в профильный канал.\n2. Собрать отклики (мин. 3).\n3. Отобрать 1–2 кандидатов.',
    stageKind: 'searching_tutor',
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const messageTemplatesStore = new MockCollection<MessageTemplate>(
  'message_templates',
  templates,
);
export const scriptsStore = new MockCollection<Script>('scripts', scripts);
