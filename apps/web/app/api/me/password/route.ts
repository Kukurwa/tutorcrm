import { NextResponse } from 'next/server';

import { changePasswordRequestSchema } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { errorResponse, parseJson } from '@/lib/api/response';
import { setPassword, verifyPassword } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, changePasswordRequestSchema);
  if (!parsed.success) return parsed.response;

  if (!verifyPassword(guard.session.user.id, parsed.data.currentPassword)) {
    return errorResponse('VALIDATION_ERROR', 'Текущий пароль неверный', {
      field: 'currentPassword',
    });
  }

  setPassword(guard.session.user.id, parsed.data.newPassword);
  return NextResponse.json({ ok: true });
}
