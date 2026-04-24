import { NextResponse } from 'next/server';

import { updateSystemSettingsSchema } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { parseJson } from '@/lib/api/response';
import { getSystemSettings, updateSystemSettings } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  return NextResponse.json({ settings: getSystemSettings() });
}

export async function PUT(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateSystemSettingsSchema);
  if (!parsed.success) return parsed.response;

  const next = updateSystemSettings(parsed.data);
  return NextResponse.json({ settings: next });
}
