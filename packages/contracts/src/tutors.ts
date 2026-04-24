import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const tutorStatusSchema = z.enum(['active', 'paused', 'blocked']);
export type TutorStatus = z.infer<typeof tutorStatusSchema>;

export const tutorSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  phone: z.string().nullable(),
  experienceYears: z.number().int().min(0),
  subjects: z.array(idSchema),
  hourlyRate: z.number().int().min(0),
  note: z.string().nullable(),
  status: tutorStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Tutor = z.infer<typeof tutorSchema>;

export const createTutorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3).nullable().default(null),
  experienceYears: z.number().int().min(0).default(0),
  subjects: z.array(idSchema).default([]),
  hourlyRate: z.number().int().min(0).default(0),
  note: z.string().nullable().default(null),
  status: tutorStatusSchema.default('active'),
});
export type CreateTutorRequest = z.infer<typeof createTutorSchema>;

export const updateTutorSchema = createTutorSchema.partial();
export type UpdateTutorRequest = z.infer<typeof updateTutorSchema>;
