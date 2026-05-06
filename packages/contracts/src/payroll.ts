import { z } from 'zod';

import { isoDateTimeSchema } from './common';

export const payrollRangeSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().positive().nullable(),
});
export type PayrollRange = z.infer<typeof payrollRangeSchema>;

export const payrollRopRowSchema = payrollRangeSchema.extend({
  percent: z.number().min(0).max(100),
  fixed: z.number().int().nonnegative(),
});
export type PayrollRopRow = z.infer<typeof payrollRopRowSchema>;

export const payrollDispatcherCellSchema = z.object({
  percent: z.number().min(0).max(100),
  fixed: z.number().int().nonnegative(),
});
export type PayrollDispatcherCell = z.infer<typeof payrollDispatcherCellSchema>;

export const tenureBucketSchema = z.enum(['lt6', 'gte6', 'gte12', 'gte36', 'gte48']);
export type TenureBucket = z.infer<typeof tenureBucketSchema>;

export const TENURE_BUCKETS: TenureBucket[] = ['lt6', 'gte6', 'gte12', 'gte36', 'gte48'];

export const TENURE_LABELS: Record<TenureBucket, string> = {
  lt6: '< 6 мес',
  gte6: '6+ мес',
  gte12: '12+ мес',
  gte36: '3+ года',
  gte48: '4+ года',
};

export const payrollConfigSchema = z.object({
  ropScale: z.array(payrollRopRowSchema).length(5),
  dispatcherRanges: z.array(payrollRangeSchema).length(5),
  dispatcherMatrix: z.array(z.array(payrollDispatcherCellSchema).length(5)).length(5),
  updatedAt: isoDateTimeSchema,
});
export type PayrollConfig = z.infer<typeof payrollConfigSchema>;

export const updatePayrollConfigSchema = payrollConfigSchema.omit({ updatedAt: true }).partial();
export type UpdatePayrollConfigRequest = z.infer<typeof updatePayrollConfigSchema>;
