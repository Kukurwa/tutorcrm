import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const messageTemplateKindSchema = z.enum([
  'greeting',
  'qualify',
  'request_brief',
  'assignment_client',
  'assignment_tutor',
  'trial_feedback',
  'invoice_reminder',
  'general',
]);
export type MessageTemplateKind = z.infer<typeof messageTemplateKindSchema>;

export const messageTemplateSchema = z.object({
  id: idSchema,
  kind: messageTemplateKindSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  variables: z.array(z.string().min(1)),
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

export const createMessageTemplateSchema = z.object({
  kind: messageTemplateKindSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  variables: z.array(z.string().min(1)).default([]),
  active: z.boolean().default(true),
});
export type CreateMessageTemplateRequest = z.infer<typeof createMessageTemplateSchema>;

export const updateMessageTemplateSchema = createMessageTemplateSchema.partial();
export type UpdateMessageTemplateRequest = z.infer<typeof updateMessageTemplateSchema>;

export const scriptSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  stageKind: z.string().nullable(),
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Script = z.infer<typeof scriptSchema>;

export const createScriptSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  stageKind: z.string().nullable().default(null),
  active: z.boolean().default(true),
});
export type CreateScriptRequest = z.infer<typeof createScriptSchema>;

export const updateScriptSchema = createScriptSchema.partial();
export type UpdateScriptRequest = z.infer<typeof updateScriptSchema>;
