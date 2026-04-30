import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const messengerChannelSchema = z.enum([
  'telegram',
  'whatsapp',
  'viber',
  'instagram',
  'facebook',
]);
export type MessengerChannel = z.infer<typeof messengerChannelSchema>;

export const messageDirectionSchema = z.enum(['in', 'out']);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;

export const messageSchema = z.object({
  id: idSchema,
  dialogId: idSchema,
  direction: messageDirectionSchema,
  text: z.string(),
  authorName: z.string().nullable(),
  sentAt: isoDateTimeSchema,
  read: z.boolean(),
});
export type Message = z.infer<typeof messageSchema>;

export const dialogStageSchema = z.enum([
  'new_dialog',
  'lead_created',
  'request_created',
  'published',
  'searching_tutor',
  'tutor_found',
  'trial_scheduled',
  'trial_done',
  'active',
  'closed_won',
  'closed_lost',
]);
export type DialogStage = z.infer<typeof dialogStageSchema>;

// Тип собеседника — определяет автонаполнение системных папок:
// «Репетиторы» — диалоги с репетиторами, «Рабочие группы» — внутренние чаты диспетчеров.
export const dialogPartyKindSchema = z.enum(['client', 'tutor', 'work_group']);
export type DialogPartyKind = z.infer<typeof dialogPartyKindSchema>;

export const dialogSchema = z.object({
  id: idSchema,
  channel: messengerChannelSchema,
  externalId: z.string(),
  clientId: idSchema.nullable(),
  clientName: z.string(),
  dispatcherId: idSchema.nullable(),
  stage: dialogStageSchema,
  partyKind: dialogPartyKindSchema,
  tutorId: idSchema.nullable(),
  folderId: idSchema.nullable(), // пользовательская папка
  leadId: idSchema.nullable(),
  requestId: idSchema.nullable(),
  unread: z.number().int().min(0),
  lastMessagePreview: z.string(),
  lastMessageAt: isoDateTimeSchema,
  slaDueAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Dialog = z.infer<typeof dialogSchema>;

export const sendMessageSchema = z.object({
  text: z.string().min(1),
});
export type SendMessageRequest = z.infer<typeof sendMessageSchema>;

export const initiateDialogSchema = z.object({
  channel: messengerChannelSchema,
  contact: z.string().min(3),
  clientId: idSchema.nullable().default(null),
  firstMessage: z.string().min(1),
});
export type InitiateDialogRequest = z.infer<typeof initiateDialogSchema>;

export const simulateIncomingSchema = z.object({
  dialogId: idSchema.optional(),
  text: z.string().optional(),
});
export type SimulateIncomingRequest = z.infer<typeof simulateIncomingSchema>;

export const createLeadFromDialogSchema = z.object({
  clientName: z.string().min(1),
  phone: z.string().nullable().default(null),
  subjectId: idSchema.nullable().default(null), // выбор предмета из выпадающего списка
  note: z.string().nullable().default(null),
});
export type CreateLeadFromDialogRequest = z.infer<typeof createLeadFromDialogSchema>;

export const createRequestFromDialogSchema = z.object({
  subjectId: idSchema.nullable().default(null),
  dealType: z.enum(['contract', 'one_time']).default('contract'),
  studentName: z.string().nullable().default(null),
  age: z.number().int().min(0).max(120).nullable().default(null),
  grade: z.string().nullable().default(null),
  schedule: z.string().nullable().default(null),
  pricePerHour: z.string().trim().max(40).nullable().default(null),
  requestPrice: z.string().trim().max(40).nullable().default(null),
  extraInfo: z.string().nullable().default(null),
  description: z.string().default(''),
});
export type CreateRequestFromDialogRequest = z.infer<typeof createRequestFromDialogSchema>;

// Пользовательские папки Inbox
export const inboxFolderSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  ownerId: idSchema, // владелец (диспетчер/админ)
  color: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type InboxFolder = z.infer<typeof inboxFolderSchema>;

export const createInboxFolderSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().default(null),
});
export type CreateInboxFolderRequest = z.infer<typeof createInboxFolderSchema>;

export const updateDialogSchema = z.object({
  stage: dialogStageSchema.optional(),
  folderId: idSchema.nullable().optional(),
});
export type UpdateDialogRequest = z.infer<typeof updateDialogSchema>;
