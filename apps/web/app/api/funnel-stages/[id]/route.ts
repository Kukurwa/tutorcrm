import { NextResponse } from 'next/server';

import { updateFunnelStageSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { funnelStagesStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateFunnelStageSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await funnelStagesStore.requireById(params.id);
    const next = { ...current, ...parsed.data, updatedAt: nowIso() };
    await funnelStagesStore.upsert(next);
    return NextResponse.json({ stage: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Stage not found');
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;
  try {
    await funnelStagesStore.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Stage not found');
    }
    throw err;
  }
}
