import { z } from 'zod';

export const autoActionKeySchema = z.enum([
  'auto_assign_dispatcher_on_new_dialog',
  'auto_publish_to_channels_on_request_ready',
  'auto_create_feedback_task_on_assignment',
  'auto_generate_invoices_weekly',
  'auto_mark_overdue_invoices',
]);
export type AutoActionKey = z.infer<typeof autoActionKeySchema>;

export const systemSettingsSchema = z.object({
  invoiceWeekday: z.number().int().min(0).max(6), // 0=Sunday
  invoiceDueDays: z.number().int().min(0),
  currency: z.enum(['UAH', 'USD', 'EUR']),
  autoActions: z.record(autoActionKeySchema, z.boolean()),
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const updateSystemSettingsSchema = z.object({
  invoiceWeekday: z.number().int().min(0).max(6).optional(),
  invoiceDueDays: z.number().int().min(0).optional(),
  currency: z.enum(['UAH', 'USD', 'EUR']).optional(),
  autoActions: z.record(autoActionKeySchema, z.boolean()).optional(),
});
export type UpdateSystemSettingsRequest = z.infer<typeof updateSystemSettingsSchema>;
