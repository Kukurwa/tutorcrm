import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const contractStatusSchema = z.enum([
  'active',
  'paused',
  'closed_won',
  'closed_lost',
]);
export type ContractStatus = z.infer<typeof contractStatusSchema>;

export const contractSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  clientId: idSchema,
  clientName: z.string(),
  tutorId: idSchema,
  tutorName: z.string(),
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  hourlyRate: z.number().int().min(0),
  commissionRate: z.number().min(0).max(1),
  status: contractStatusSchema,
  startedAt: isoDateTimeSchema,
  pausedAt: isoDateTimeSchema.nullable(),
  closedAt: isoDateTimeSchema.nullable(),
  closeReason: z.string().nullable(),
  dispatcherId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Contract = z.infer<typeof contractSchema>;

export const contractEventKindSchema = z.enum([
  'created',
  'paused',
  'resumed',
  'tutor_replaced',
  'closed',
]);
export type ContractEventKind = z.infer<typeof contractEventKindSchema>;

export const contractEventSchema = z.object({
  id: idSchema,
  contractId: idSchema,
  kind: contractEventKindSchema,
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type ContractEvent = z.infer<typeof contractEventSchema>;

export const weeklyLessonCountSchema = z.object({
  id: idSchema,
  contractId: idSchema,
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(0),
  enteredAt: isoDateTimeSchema,
  enteredBy: idSchema,
});
export type WeeklyLessonCount = z.infer<typeof weeklyLessonCountSchema>;

export const oneTimePaymentStatusSchema = z.enum(['pending', 'paid', 'missed']);
export type OneTimePaymentStatus = z.infer<typeof oneTimePaymentStatusSchema>;

export const oneTimeDealPaymentSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  amount: z.number().int().min(0),
  status: oneTimePaymentStatusSchema,
  paidAt: isoDateTimeSchema.nullable(),
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type OneTimeDealPayment = z.infer<typeof oneTimeDealPaymentSchema>;

// Requests
export const createContractSchema = z.object({
  requestId: idSchema,
  tutorId: idSchema,
  hourlyRate: z.number().int().min(0),
  commissionRate: z.number().min(0).max(1).default(0.2),
});
export type CreateContractRequest = z.infer<typeof createContractSchema>;

export const pauseContractSchema = z.object({
  note: z.string().optional(),
});
export type PauseContractRequest = z.infer<typeof pauseContractSchema>;

export const closeContractSchema = z.object({
  reason: z.string().min(1),
});
export type CloseContractRequest = z.infer<typeof closeContractSchema>;

export const replaceTutorSchema = z.object({
  tutorId: idSchema,
  note: z.string().optional(),
});
export type ReplaceTutorRequest = z.infer<typeof replaceTutorSchema>;

export const submitWeeklyLessonsSchema = z.object({
  contractId: idSchema,
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(0),
});
export type SubmitWeeklyLessonsRequest = z.infer<typeof submitWeeklyLessonsSchema>;

export const recordOneTimePaymentSchema = z.object({
  requestId: idSchema,
  amount: z.number().int().min(0),
  status: oneTimePaymentStatusSchema.default('pending'),
  note: z.string().nullable().default(null),
});
export type RecordOneTimePaymentRequest = z.infer<typeof recordOneTimePaymentSchema>;

export const updateOneTimePaymentSchema = z.object({
  status: oneTimePaymentStatusSchema.optional(),
  note: z.string().nullable().optional(),
});
export type UpdateOneTimePaymentRequest = z.infer<typeof updateOneTimePaymentSchema>;
