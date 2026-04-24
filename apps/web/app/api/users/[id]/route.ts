import { NextResponse } from 'next/server';

import { updateUserSchema, type UserPublic } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, usersStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateUserSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await usersStore.requireById(params.id);
    const next = { ...current, ...parsed.data, updatedAt: nowIso() };
    await usersStore.upsert(next);
    const publicUser: UserPublic = {
      id: next.id,
      email: next.email,
      name: next.name,
      role: next.role,
      status: next.status,
    };
    return NextResponse.json({ user: publicUser });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'User not found');
    }
    throw err;
  }
}
