import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const roleSchema = z.enum(['admin', 'dispatcher', 'leadgen']);
export type Role = z.infer<typeof roleSchema>;

export const userStatusSchema = z.enum(['active', 'blocked']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const themeSchema = z.enum(['system', 'light', 'dark']);
export type Theme = z.infer<typeof themeSchema>;

export const notificationCategorySchema = z.enum([
  'inbox',
  'responses',
  'feedback',
  'invoices',
  'sla',
  'system',
]);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
});
export type QuietHours = z.infer<typeof quietHoursSchema>;

export const userNotificationsSchema = z.record(notificationCategorySchema, z.boolean());
export type UserNotifications = z.infer<typeof userNotificationsSchema>;

export const userSettingsSchema = z.object({
  theme: themeSchema,
  notifications: userNotificationsSchema,
  quietHours: quietHoursSchema,
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const userSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  name: z.string().min(1),
  role: roleSchema,
  status: userStatusSchema,
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

export const userPublicSchema = userSchema.pick({
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
});
export type UserPublic = z.infer<typeof userPublicSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  user: userPublicSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const sessionSchema = z.object({
  user: userPublicSchema,
  expiresAt: isoDateTimeSchema,
});
export type Session = z.infer<typeof sessionSchema>;

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  });
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const updateUserSettingsSchema = z.object({
  theme: themeSchema.optional(),
  notifications: userNotificationsSchema.optional(),
  quietHours: quietHoursSchema.partial().optional(),
});
export type UpdateUserSettingsRequest = z.infer<typeof updateUserSettingsSchema>;
