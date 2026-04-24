import { NextResponse } from 'next/server';

import { updateUserSettingsSchema } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { parseJson } from '@/lib/api/response';
import { setUserSettings } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateUserSettingsSchema);
  if (!parsed.success) return parsed.response;

  const next = setUserSettings(guard.session.user.id, parsed.data);
  return NextResponse.json({ settings: next });
}
