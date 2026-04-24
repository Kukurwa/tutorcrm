import { z } from 'zod';

const booleanStringDefault = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return defaultValue;
      return v === 'true' || v === '1';
    });

const numberFromString = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return defaultValue;
      const parsed = Number(v);
      if (Number.isNaN(parsed)) return defaultValue;
      return parsed;
    });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  NEXT_PUBLIC_APP_NAME: z.string().default('TutorCRM'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['ru', 'uk', 'en']).default('ru'),
  NEXT_PUBLIC_DEFAULT_TZ: z.string().default('Europe/Kyiv'),

  NEXTAUTH_SECRET: z.string().min(16).default('dev-secret-change-me-please-32b'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),

  MOCK_LATENCY_MS: numberFromString(0),
  MOCK_ERROR_RATE: numberFromString(0),
  MOCK_ENABLED: booleanStringDefault(false),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n  ');
    throw new Error(`Invalid environment variables:\n  ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
