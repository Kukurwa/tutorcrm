import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const contractStatusSchema = z.enum(['active', 'paused', 'closed_won', 'closed_lost']);
export type ContractStatus = z.infer<typeof contractStatusSchema>;

const priceTextSchema = z.string().trim().max(40).nullable();

export const contractSchema = z.object({
  id: idSchema,
  // Код заказа: А-1, М-5 (regular) или НДК-1.1 (contract)
  code: z.string().nullable(),
  requestId: idSchema,
  clientId: idSchema,
  clientName: z.string(),
  // Поля для Excel-таблицы клиентов и карточки ученика
  studentName: z.string().nullable(),
  parentName: z.string().nullable(), // отображается в примечаниях, отдельно для удобства
  age: z.number().int().min(0).max(120).nullable(),
  level: z.string().nullable(),
  contactInfo: z.string().nullable(), // дублирует контакты клиента для быстрого доступа
  tutorId: idSchema,
  tutorName: z.string(),
  tutorContact: z.string().nullable(),
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  hourlyRate: z.number().int().min(0),
  pricePerLesson: priceTextSchema,
  lessonsPerWeek: z.number().int().min(0).nullable(),
  requestPrice: priceTextSchema,
  trialAt: isoDateTimeSchema.nullable(), // дата пробного
  paidAt: isoDateTimeSchema.nullable(), // по факту (дата оплаты)
  amountReceived: z.number().int().min(0).nullable(), // получено (сумма)
  accountantVerified: z.boolean(), // галочка бухгалтера
  onFop: z.boolean(), // На ФОП?
  comment: z.string().nullable(),
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

// Старая модель: просто число уроков на неделе. Оставлена как fallback —
// диспетчер может либо ввести точные даты (Lesson), либо число уроков целиком.
export const weeklyLessonCountSchema = z.object({
  id: idSchema,
  contractId: idSchema,
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(0),
  enteredAt: isoDateTimeSchema,
  enteredBy: idSchema,
});
export type WeeklyLessonCount = z.infer<typeof weeklyLessonCountSchema>;

// Урок с конкретной датой и статусом (по правкам клиента)
export const lessonStatusSchema = z.enum(['success', 'rescheduled', 'cancelled']);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

export const lessonSchema = z.object({
  id: idSchema,
  contractId: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: lessonStatusSchema,
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type Lesson = z.infer<typeof lessonSchema>;

export const createLessonSchema = z.object({
  contractId: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: lessonStatusSchema.default('success'),
  note: z.string().nullable().default(null),
});
export type CreateLessonRequest = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: lessonStatusSchema.optional(),
  note: z.string().nullable().optional(),
});
export type UpdateLessonRequest = z.infer<typeof updateLessonSchema>;

export const oneTimePaymentStatusSchema = z.enum(['pending', 'paid', 'missed']);
export type OneTimePaymentStatus = z.infer<typeof oneTimePaymentStatusSchema>;

export const oneTimeDealPaymentSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  amount: z.number().int().min(0),
  status: oneTimePaymentStatusSchema,
  paidAt: isoDateTimeSchema.nullable(),
  accountantVerified: z.boolean(), // галочка бухгалтера «оплата найдена»
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type OneTimeDealPayment = z.infer<typeof oneTimeDealPaymentSchema>;

// Update contract — для редактирования полей карточки ученика
export const updateContractSchema = z.object({
  studentName: z.string().nullable().optional(),
  parentName: z.string().nullable().optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  level: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  tutorContact: z.string().nullable().optional(),
  pricePerLesson: priceTextSchema.optional(),
  lessonsPerWeek: z.number().int().min(0).nullable().optional(),
  requestPrice: priceTextSchema.optional(),
  trialAt: isoDateTimeSchema.nullable().optional(),
  paidAt: isoDateTimeSchema.nullable().optional(),
  amountReceived: z.number().int().min(0).nullable().optional(),
  accountantVerified: z.boolean().optional(),
  onFop: z.boolean().optional(),
  comment: z.string().nullable().optional(),
  hourlyRate: z.number().int().min(0).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
});
export type UpdateContractRequest = z.infer<typeof updateContractSchema>;

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
  accountantVerified: z.boolean().optional(),
  note: z.string().nullable().optional(),
});
export type UpdateOneTimePaymentRequest = z.infer<typeof updateOneTimePaymentSchema>;
