import { loadEnv } from '@tutorcrm/config';

const env = loadEnv();

export const mockSettings = {
  enabled: env.MOCK_ENABLED,
  latencyMs: env.MOCK_LATENCY_MS,
  errorRate: Math.max(0, Math.min(1, env.MOCK_ERROR_RATE)),
} as const;

export async function simulateLatency(): Promise<void> {
  if (mockSettings.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, mockSettings.latencyMs));
  }
}

export function shouldSimulateError(): boolean {
  if (mockSettings.errorRate <= 0) return false;
  return Math.random() < mockSettings.errorRate;
}
