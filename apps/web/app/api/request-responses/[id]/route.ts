import { NextResponse } from 'next/server';

import { updateRequestResponseSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, requestResponsesStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateRequestResponseSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await requestResponsesStore.requireById(params.id);
    const next = { ...current, ...parsed.data };
    await requestResponsesStore.upsert(next);
    return NextResponse.json({ response: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Response not found');
    }
    throw err;
  }
}
