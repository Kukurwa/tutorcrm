import { NextResponse } from 'next/server';

import { updateTutorSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, tutorsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateTutorSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await tutorsStore.requireById(params.id);
    const next = { ...current, ...parsed.data, updatedAt: nowIso() };
    await tutorsStore.upsert(next);
    return NextResponse.json({ tutor: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Tutor not found');
    }
    throw err;
  }
}
