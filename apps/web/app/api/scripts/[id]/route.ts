import { NextResponse } from 'next/server';

import { updateScriptSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, scriptsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateScriptSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await scriptsStore.requireById(params.id);
    const next = { ...current, ...parsed.data, updatedAt: nowIso() };
    await scriptsStore.upsert(next);
    return NextResponse.json({ script: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Script not found');
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;
  try {
    await scriptsStore.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Script not found');
    }
    throw err;
  }
}
