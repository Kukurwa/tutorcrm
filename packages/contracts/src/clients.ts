import { z } from 'zod';

import { idSchema, isoDateTimeSchema, paginationQuerySchema } from './common';

export const contactKindSchema = z.enum(['phone', 'telegram', 'whatsapp', 'viber', 'instagram', 'facebook', 'email']);
export type ContactKind = z.infer<typeof contactKindSchema>;

export const clientContactSchema = z.object({
  id: idSchema,
  clientId: idSchema,
  kind: contactKindSchema,
  value: z.string().min(1),
  primary: z.boolean(),
});
export type ClientContact = z.infer<typeof clientContactSchema>;

export const clientSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  phone: z.string().nullable(),
  note: z.string().nullable(),
  createdBy: idSchema.nullable(),
  dispatcherId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Client = z.infer<typeof clientSchema>;

export const clientWithContactsSchema = clientSchema.extend({
  contacts: z.array(clientContactSchema),
});
export type ClientWithContacts = z.infer<typeof clientWithContactsSchema>;

export const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3).nullable().default(null),
  note: z.string().nullable().default(null),
  dispatcherId: idSchema.nullable().default(null),
  contacts: z
    .array(
      z.object({
        kind: contactKindSchema,
        value: z.string().min(1),
        primary: z.boolean().default(false),
      }),
    )
    .default([]),
});
export type CreateClientRequest = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(3).nullable().optional(),
  note: z.string().nullable().optional(),
  dispatcherId: idSchema.nullable().optional(),
});
export type UpdateClientRequest = z.infer<typeof updateClientSchema>;

export const listClientsQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  dispatcherId: idSchema.optional(),
});
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;

// Leads (от LeadGen)
export const leadStatusSchema = z.enum(['new', 'assigned', 'converted', 'rejected']);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const leadSchema = z.object({
  id: idSchema,
  clientName: z.string().min(1),
  phone: z.string().nullable(),
  subject: z.string().nullable(),
  note: z.string().nullable(),
  status: leadStatusSchema,
  createdBy: idSchema,
  dispatcherId: idSchema.nullable(),
  clientId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Lead = z.infer<typeof leadSchema>;

export const createLeadSchema = z.object({
  clientName: z.string().min(1),
  phone: z.string().min(3).nullable().default(null),
  subject: z.string().nullable().default(null),
  note: z.string().nullable().default(null),
});
export type CreateLeadRequest = z.infer<typeof createLeadSchema>;

export const assignLeadSchema = z.object({
  dispatcherId: idSchema,
});
export type AssignLeadRequest = z.infer<typeof assignLeadSchema>;

// Users CRUD (admin)
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'dispatcher', 'leadgen']),
  password: z.string().min(8),
});
export type CreateUserRequest = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'dispatcher', 'leadgen']).optional(),
  status: z.enum(['active', 'blocked']).optional(),
});
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
