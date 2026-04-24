import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'skipped']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceRecipientSchema = z.enum(['client', 'tutor']);
export type InvoiceRecipient = z.infer<typeof invoiceRecipientSchema>;

export const invoiceSchema = z.object({
  id: idSchema,
  contractId: idSchema,
  weeklyCountId: idSchema.nullable(),
  recipient: invoiceRecipientSchema,
  amount: z.number().int().min(0),
  currency: z.enum(['UAH', 'USD', 'EUR']),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: invoiceStatusSchema,
  sentAt: isoDateTimeSchema.nullable(),
  paidAt: isoDateTimeSchema.nullable(),
  skippedAt: isoDateTimeSchema.nullable(),
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceEventKindSchema = z.enum([
  'generated',
  'amount_changed',
  'sent',
  'paid',
  'overdue',
  'skipped',
]);
export type InvoiceEventKind = z.infer<typeof invoiceEventKindSchema>;

export const invoiceEventSchema = z.object({
  id: idSchema,
  invoiceId: idSchema,
  kind: invoiceEventKindSchema,
  note: z.string().nullable(),
  actorId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type InvoiceEvent = z.infer<typeof invoiceEventSchema>;

export const generateInvoicesSchema = z.object({
  contractId: idSchema,
  weeklyCountId: idSchema,
});
export type GenerateInvoicesRequest = z.infer<typeof generateInvoicesSchema>;

export const updateInvoiceAmountSchema = z.object({
  amount: z.number().int().min(0),
});
export type UpdateInvoiceAmountRequest = z.infer<typeof updateInvoiceAmountSchema>;
