import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const dealTypeSchema = z.enum(['contract', 'one_time']);
export type DealType = z.infer<typeof dealTypeSchema>;

export const subjectChannelSchema = z.object({
  id: idSchema,
  subjectId: idSchema,
  dealType: dealTypeSchema,
  channelName: z.string().min(1),
  channelUrl: z.string().url().optional(),
  active: z.boolean(),
});
export type SubjectChannel = z.infer<typeof subjectChannelSchema>;

export const subjectSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Subject = z.infer<typeof subjectSchema>;

export const subjectWithChannelsSchema = subjectSchema.extend({
  channels: z.array(subjectChannelSchema),
});
export type SubjectWithChannels = z.infer<typeof subjectWithChannelsSchema>;

export const createSubjectSchema = z.object({
  name: z.string().min(1),
  active: z.boolean().default(true),
});
export type CreateSubjectRequest = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = createSubjectSchema.partial();
export type UpdateSubjectRequest = z.infer<typeof updateSubjectSchema>;

export const createSubjectChannelSchema = z.object({
  subjectId: idSchema,
  dealType: dealTypeSchema,
  channelName: z.string().min(1),
  channelUrl: z.string().url().optional(),
  active: z.boolean().default(true),
});
export type CreateSubjectChannelRequest = z.infer<typeof createSubjectChannelSchema>;

export const updateSubjectChannelSchema = createSubjectChannelSchema.partial().omit({
  subjectId: true,
});
export type UpdateSubjectChannelRequest = z.infer<typeof updateSubjectChannelSchema>;
