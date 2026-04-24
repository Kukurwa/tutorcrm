import { NextResponse } from 'next/server';

import { updateSubjectSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, subjectChannelsStore, subjectsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateSubjectSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await subjectsStore.requireById(params.id);
    const next = {
      ...current,
      ...parsed.data,
      updatedAt: nowIso(),
    };
    await subjectsStore.upsert(next);
    return NextResponse.json({ subject: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Subject not found');
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  try {
    await subjectsStore.remove(params.id);
    // Cascade-remove channels
    const channels = await subjectChannelsStore.list();
    for (const ch of channels.filter((c) => c.subjectId === params.id)) {
      await subjectChannelsStore.remove(ch.id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Subject not found');
    }
    throw err;
  }
}
