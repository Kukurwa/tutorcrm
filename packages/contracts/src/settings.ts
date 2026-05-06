import { z } from 'zod';

export const autoActionKeySchema = z.enum([
  'auto_assign_dispatcher_on_new_dialog',
  'auto_publish_to_channels_on_request_ready',
  'auto_create_feedback_task_on_assignment',
  'auto_generate_invoices_weekly',
  'auto_mark_overdue_invoices',
]);
export type AutoActionKey = z.infer<typeof autoActionKeySchema>;

export const regularPricingSchema = z.object({
  onePerWeek: z.number().int().nonnegative(),
  twoPerWeek: z.number().int().nonnegative(),
  threePerWeek: z.number().int().nonnegative(),
});
export type RegularPricing = z.infer<typeof regularPricingSchema>;

export const systemSettingsSchema = z.object({
  invoiceWeekday: z.number().int().min(0).max(6), // 0=Sunday
  invoiceDueDays: z.number().int().min(0),
  currency: z.enum(['UAH', 'USD', 'EUR']),
  autoActions: z.record(autoActionKeySchema, z.boolean()),
  // Прайс «обычных» условий (для метрики рентабельности контрактных). Глобальный, можно перебить по предмету в profitabilityBySubject.
  regularPricing: regularPricingSchema,
  regularPricingBySubject: z.record(z.string(), regularPricingSchema),
  // Cutoff в днях для метрики рентабельности — отбрасываем клиентов младше этого срока.
  profitabilityCutoffDays: z.number().int().min(1).max(365),
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const updateSystemSettingsSchema = z.object({
  invoiceWeekday: z.number().int().min(0).max(6).optional(),
  invoiceDueDays: z.number().int().min(0).optional(),
  currency: z.enum(['UAH', 'USD', 'EUR']).optional(),
  autoActions: z.record(autoActionKeySchema, z.boolean()).optional(),
  regularPricing: regularPricingSchema.optional(),
  regularPricingBySubject: z.record(z.string(), regularPricingSchema).optional(),
  profitabilityCutoffDays: z.number().int().min(1).max(365).optional(),
});
export type UpdateSystemSettingsRequest = z.infer<typeof updateSystemSettingsSchema>;
