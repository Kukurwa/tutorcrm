import { z } from 'zod';

import { idSchema, isoDateTimeSchema, paginationQuerySchema } from './common';
import { dealTypeSchema } from './subjects';

export const requestStageKindSchema = z.enum([
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
export type RequestStageKind = z.infer<typeof requestStageKindSchema>;

// «Договірна» — диспетчер может вписать слово вместо числа; храним как nullable string.
const priceTextSchema = z.string().trim().max(40).nullable();

export const requestSchema = z.object({
  id: idSchema,
  clientId: idSchema,
  clientName: z.string(),
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  dealType: dealTypeSchema,
  description: z.string(),
  // Новая модель полей по правкам клиента
  studentName: z.string().nullable(),
  age: z.number().int().min(0).max(120).nullable(),
  grade: z.string().nullable(), // класс
  schedule: z.string().nullable(),
  pricePerHour: priceTextSchema, // цена/час — число строкой или «Договірна»
  requestPrice: priceTextSchema, // цена заявки
  extraInfo: z.string().nullable(),
  // Старая модель — оставлена для обратной совместимости с моками/инвойсами
  budgetFrom: z.number().int().min(0).nullable(),
  budgetTo: z.number().int().min(0).nullable(),
  stage: requestStageKindSchema,
  dispatcherId: idSchema.nullable(),
  publishedChannels: z.array(z.string()),
  publishedAt: isoDateTimeSchema.nullable(),
  republishedAt: isoDateTimeSchema.nullable(),
  republishCount: z.number().int().min(0).default(0),
  assignedTutorId: idSchema.nullable(),
  rejectionReasonId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Request = z.infer<typeof requestSchema>;

export const createRequestSchema = z.object({
  clientId: idSchema,
  subjectId: idSchema.nullable().default(null),
  dealType: dealTypeSchema,
  description: z.string().default(''),
  studentName: z.string().nullable().default(null),
  age: z.number().int().min(0).max(120).nullable().default(null),
  grade: z.string().nullable().default(null),
  schedule: z.string().nullable().default(null),
  pricePerHour: priceTextSchema.default(null),
  requestPrice: priceTextSchema.default(null),
  extraInfo: z.string().nullable().default(null),
});
export type CreateRequestRequest = z.infer<typeof createRequestSchema>;

export const updateRequestSchema = z.object({
  description: z.string().optional(),
  subjectId: idSchema.nullable().optional(),
  dealType: dealTypeSchema.optional(),
  studentName: z.string().nullable().optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  grade: z.string().nullable().optional(),
  schedule: z.string().nullable().optional(),
  pricePerHour: priceTextSchema.optional(),
  requestPrice: priceTextSchema.optional(),
  extraInfo: z.string().nullable().optional(),
});
export type UpdateRequestRequest = z.infer<typeof updateRequestSchema>;

export const transitionRequestSchema = z.object({
  to: requestStageKindSchema,
  rejectionReasonId: idSchema.optional(),
  tutorId: idSchema.optional(),
});
export type TransitionRequestRequest = z.infer<typeof transitionRequestSchema>;

export const listRequestsQuerySchema = paginationQuerySchema.extend({
  stage: requestStageKindSchema.optional(),
  q: z.string().optional(),
  dispatcherId: idSchema.optional(),
  subjectId: idSchema.optional(),
});
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;

// Перевыставление заявки: можно поправить цену и доп. описание перед повторной публикацией
export const republishRequestSchema = z.object({
  pricePerHour: priceTextSchema.optional(),
  requestPrice: priceTextSchema.optional(),
  extraInfo: z.string().nullable().optional(),
});
export type RepublishRequestRequest = z.infer<typeof republishRequestSchema>;

// Request responses
export const requestResponseStatusSchema = z.enum(['new', 'interested', 'declined', 'selected']);
export type RequestResponseStatus = z.infer<typeof requestResponseStatusSchema>;

export const requestResponseSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  tutorId: idSchema,
  tutorName: z.string(),
  note: z.string().nullable(),
  status: requestResponseStatusSchema,
  createdAt: isoDateTimeSchema,
});
export type RequestResponse = z.infer<typeof requestResponseSchema>;

export const createRequestResponseSchema = z.object({
  requestId: idSchema,
  tutorId: idSchema,
  note: z.string().nullable().default(null),
});
export type CreateRequestResponseRequest = z.infer<typeof createRequestResponseSchema>;

export const updateRequestResponseSchema = z.object({
  status: requestResponseStatusSchema.optional(),
  note: z.string().nullable().optional(),
});
export type UpdateRequestResponseRequest = z.infer<typeof updateRequestResponseSchema>;

export const publishRequestSchema = z.object({
  channels: z.array(z.string()).min(1),
});
export type PublishRequestRequest = z.infer<typeof publishRequestSchema>;

// Trials
export const trialResultSchema = z.enum(['success', 'fail']);
export type TrialResult = z.infer<typeof trialResultSchema>;

export const trialSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  tutorId: idSchema,
  scheduledAt: isoDateTimeSchema,
  result: trialResultSchema.nullable(),
  feedback: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Trial = z.infer<typeof trialSchema>;
