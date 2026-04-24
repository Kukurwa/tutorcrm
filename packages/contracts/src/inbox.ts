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

export const dialogSchema = z.object({
  id: idSchema,
  channel: messengerChannelSchema,
  externalId: z.string(),
  clientId: idSchema.nullable(),
  clientName: z.string(),
  dispatcherId: idSchema.nullable(),
  stage: dialogStageSchema,
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
  subject: z.string().nullable().default(null),
  note: z.string().nullable().default(null),
});
export type CreateLeadFromDialogRequest = z.infer<typeof createLeadFromDialogSchema>;
