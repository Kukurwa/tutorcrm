import { NextResponse } from 'next/server';

import { updateRequestSchema, type Request as Req } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, requestsStore, subjectsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  try {
    const row = await requestsStore.requireById(params.id);
    if (guard.session.user.role === 'dispatcher' && row.dispatcherId !== guard.session.user.id) {
      return errorResponse('FORBIDDEN', 'Not your request');
    }
    return NextResponse.json({ request: row });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Request not found');
    }
    throw err;
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateRequestSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await requestsStore.requireById(params.id);
    if (guard.session.user.role === 'dispatcher' && current.dispatcherId !== guard.session.user.id) {
      return errorResponse('FORBIDDEN', 'Not your request');
    }
    let subjectName = current.subjectName;
    if (parsed.data.subjectId !== undefined) {
      if (parsed.data.subjectId === null) subjectName = null;
      else {
        const s = await subjectsStore.findById(parsed.data.subjectId);
        subjectName = s?.name ?? null;
      }
    }
    const next: Req = {
      ...current,
      ...parsed.data,
      subjectName,
      updatedAt: nowIso(),
    };
    await requestsStore.upsert(next);
    return NextResponse.json({ request: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Request not found');
    }
    throw err;
  }
}
