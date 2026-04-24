import { NextResponse } from 'next/server';

import { loadEnv } from '@tutorcrm/config';

import { mockSettings } from '@/mocks/settings';
import { usersStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = loadEnv();
  return NextResponse.json({
    status: 'ok',
    env: env.NODE_ENV,
    app: env.NEXT_PUBLIC_APP_NAME,
    mocks: {
      enabled: mockSettings.enabled,
      latencyMs: mockSettings.latencyMs,
      errorRate: mockSettings.errorRate,
      seededUsers: usersStore.size(),
    },
    time: new Date().toISOString(),
  });
}
