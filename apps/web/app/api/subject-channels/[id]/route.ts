import { NextResponse } from 'next/server';

import { updateSubjectChannelSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, subjectChannelsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateSubjectChannelSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await subjectChannelsStore.requireById(params.id);
    const next = { ...current, ...parsed.data };
    await subjectChannelsStore.upsert(next);
    return NextResponse.json({ channel: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Channel not found');
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;
  try {
    await subjectChannelsStore.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Channel not found');
    }
    throw err;
  }
}
