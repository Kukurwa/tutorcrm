import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';
import { notificationCategorySchema } from './user';

export const notificationSchema = z.object({
  id: idSchema,
  userId: idSchema,
  category: notificationCategorySchema,
  title: z.string().min(1),
  body: z.string(),
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: isoDateTimeSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

export const createNotificationSchema = z.object({
  userId: idSchema,
  category: notificationCategorySchema,
  title: z.string().min(1),
  body: z.string().default(''),
  link: z.string().nullable().default(null),
});
export type CreateNotificationRequest = z.infer<typeof createNotificationSchema>;

export const markNotificationsReadSchema = z.object({
  ids: z.array(idSchema).optional(),
});
export type MarkNotificationsReadRequest = z.infer<typeof markNotificationsReadSchema>;
