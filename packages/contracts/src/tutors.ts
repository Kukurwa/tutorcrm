import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const tutorStatusSchema = z.enum(['active', 'paused', 'blocked']);
export type TutorStatus = z.infer<typeof tutorStatusSchema>;

// Тип условий: контрактный (длительные) или обычный (разовые / стандартные)
export const tutorTermsKindSchema = z.enum(['contract', 'regular']);
export type TutorTermsKind = z.infer<typeof tutorTermsKindSchema>;

export const tutorSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  phone: z.string().nullable(),
  // Расширенные поля по правкам клиента
  viberPhone: z.string().nullable(),
  telegramHandle: z.string().nullable(), // Нік в телеграмі
  age: z.number().int().min(0).max(120).nullable(),
  experienceYears: z.number().int().min(0),
  isOffline: z.boolean(), // Офлайн? (ні/місто)
  offlineCity: z.string().nullable(),
  additionalSubject: z.string().nullable(), // Додатковий предмет?
  education: z.string().nullable(), // Освіта / де навчається
  teachesInRussian: z.boolean(),
  workingLevels: z.array(z.string()), // З якими рівнями знань працює
  workingAgeRange: z.string().nullable(), // З якою віковою категорією працює
  teachingMethodNotes: z.string().nullable(), // Особливості методу
  additionalInfo: z.string().nullable(),
  isBlacklisted: z.boolean(), // Реп в ЧС
  termsKind: tutorTermsKindSchema,
  // Существующие поля
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
  viberPhone: z.string().nullable().default(null),
  telegramHandle: z.string().nullable().default(null),
  age: z.number().int().min(0).max(120).nullable().default(null),
  experienceYears: z.number().int().min(0).default(0),
  isOffline: z.boolean().default(false),
  offlineCity: z.string().nullable().default(null),
  additionalSubject: z.string().nullable().default(null),
  education: z.string().nullable().default(null),
  teachesInRussian: z.boolean().default(false),
  workingLevels: z.array(z.string()).default([]),
  workingAgeRange: z.string().nullable().default(null),
  teachingMethodNotes: z.string().nullable().default(null),
  additionalInfo: z.string().nullable().default(null),
  isBlacklisted: z.boolean().default(false),
  termsKind: tutorTermsKindSchema.default('regular'),
  subjects: z.array(idSchema).default([]),
  hourlyRate: z.number().int().min(0).default(0),
  note: z.string().nullable().default(null),
  status: tutorStatusSchema.default('active'),
});
export type CreateTutorRequest = z.infer<typeof createTutorSchema>;

export const updateTutorSchema = createTutorSchema.partial();
export type UpdateTutorRequest = z.infer<typeof updateTutorSchema>;

// Эффективность репетитора — % выигранных контрактов от общего числа назначений
export interface TutorEffectiveness {
  tutorId: string;
  assignments: number;
  closedWon: number;
  closedLost: number;
  rate: number; // 0..1
}
