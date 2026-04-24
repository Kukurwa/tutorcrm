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

export const requestSchema = z.object({
  id: idSchema,
  clientId: idSchema,
  clientName: z.string(),
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  dealType: dealTypeSchema,
  description: z.string(),
  budgetFrom: z.number().int().min(0).nullable(),
  budgetTo: z.number().int().min(0).nullable(),
  schedule: z.string().nullable(),
  stage: requestStageKindSchema,
  dispatcherId: idSchema.nullable(),
  publishedChannels: z.array(z.string()),
  publishedAt: isoDateTimeSchema.nullable(),
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
  description: z.string().min(1),
  budgetFrom: z.number().int().min(0).nullable().default(null),
  budgetTo: z.number().int().min(0).nullable().default(null),
  schedule: z.string().nullable().default(null),
});
export type CreateRequestRequest = z.infer<typeof createRequestSchema>;

export const updateRequestSchema = z.object({
  description: z.string().min(1).optional(),
  subjectId: idSchema.nullable().optional(),
  dealType: dealTypeSchema.optional(),
  budgetFrom: z.number().int().min(0).nullable().optional(),
  budgetTo: z.number().int().min(0).nullable().optional(),
  schedule: z.string().nullable().optional(),
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
});
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;

// Request responses
export const requestResponseStatusSchema = z.enum([
  'new',
  'interested',
  'declined',
  'selected',
]);
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
