import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const funnelStageKindSchema = z.enum([
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
export type FunnelStageKind = z.infer<typeof funnelStageKindSchema>;

export const funnelStageSchema = z.object({
  id: idSchema,
  kind: funnelStageKindSchema,
  name: z.string().min(1),
  order: z.number().int().min(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  slaMinutes: z.number().int().min(0).nullable(),
  scriptId: idSchema.nullable(),
  terminal: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type FunnelStage = z.infer<typeof funnelStageSchema>;

export const createFunnelStageSchema = z.object({
  kind: funnelStageKindSchema,
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  slaMinutes: z.number().int().min(0).nullable().default(null),
  scriptId: idSchema.nullable().default(null),
  terminal: z.boolean().default(false),
});
export type CreateFunnelStageRequest = z.infer<typeof createFunnelStageSchema>;

export const updateFunnelStageSchema = createFunnelStageSchema.partial();
export type UpdateFunnelStageRequest = z.infer<typeof updateFunnelStageSchema>;

export const reorderFunnelStagesSchema = z.object({
  order: z.array(idSchema).min(1),
});
export type ReorderFunnelStagesRequest = z.infer<typeof reorderFunnelStagesSchema>;

export const rejectionReasonSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type RejectionReason = z.infer<typeof rejectionReasonSchema>;

export const createRejectionReasonSchema = z.object({
  label: z.string().min(1),
  active: z.boolean().default(true),
});
export type CreateRejectionReasonRequest = z.infer<typeof createRejectionReasonSchema>;

export const updateRejectionReasonSchema = createRejectionReasonSchema.partial();
export type UpdateRejectionReasonRequest = z.infer<typeof updateRejectionReasonSchema>;
