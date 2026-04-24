import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const taskStatusSchema = z.enum(['open', 'snoozed', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskKindSchema = z.enum([
  'feedback_after_trial',
  'sla_new_dialog',
  'sla_request',
  'weekly_lessons_missing',
  'invoice_overdue',
  'manual',
]);
export type TaskKind = z.infer<typeof taskKindSchema>;

export const taskSchema = z.object({
  id: idSchema,
  kind: taskKindSchema,
  title: z.string().min(1),
  note: z.string().nullable(),
  dueAt: isoDateTimeSchema,
  assignedToId: idSchema.nullable(),
  status: taskStatusSchema,
  snoozedUntil: isoDateTimeSchema.nullable(),
  relatedRequestId: idSchema.nullable(),
  relatedContractId: idSchema.nullable(),
  relatedDialogId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskSchema = z.object({
  kind: taskKindSchema.default('manual'),
  title: z.string().min(1),
  note: z.string().nullable().default(null),
  dueAt: isoDateTimeSchema,
  assignedToId: idSchema.nullable().default(null),
  relatedRequestId: idSchema.nullable().default(null),
  relatedContractId: idSchema.nullable().default(null),
  relatedDialogId: idSchema.nullable().default(null),
});
export type CreateTaskRequest = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  note: z.string().nullable().optional(),
  dueAt: isoDateTimeSchema.optional(),
  assignedToId: idSchema.nullable().optional(),
  status: taskStatusSchema.optional(),
  snoozedUntil: isoDateTimeSchema.nullable().optional(),
});
export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;

export const calendarEventKindSchema = z.enum(['trial', 'regular_lesson']);
export type CalendarEventKind = z.infer<typeof calendarEventKindSchema>;

export const calendarEventSchema = z.object({
  id: idSchema,
  kind: calendarEventKindSchema,
  title: z.string().min(1),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  contractId: idSchema.nullable(),
  requestId: idSchema.nullable(),
  tutorId: idSchema.nullable(),
  clientId: idSchema.nullable(),
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const createCalendarEventSchema = z.object({
  kind: calendarEventKindSchema,
  title: z.string().min(1),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  contractId: idSchema.nullable().default(null),
  requestId: idSchema.nullable().default(null),
  tutorId: idSchema.nullable().default(null),
  clientId: idSchema.nullable().default(null),
  note: z.string().nullable().default(null),
});
export type CreateCalendarEventRequest = z.infer<typeof createCalendarEventSchema>;
