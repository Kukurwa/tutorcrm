import { NextResponse } from 'next/server';

import type { UserPublic, UserSettings } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { usersStore, getUserSettings } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const user = await usersStore.requireById(guard.session.user.id);
  const settings = getUserSettings(user.id);

  const publicUser: UserPublic = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };

  const response: { user: UserPublic; settings: UserSettings } = {
    user: publicUser,
    settings,
  };

  return NextResponse.json(response);
}
