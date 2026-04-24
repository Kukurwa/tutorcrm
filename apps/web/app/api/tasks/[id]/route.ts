import { NextResponse } from 'next/server';

import { updateTaskSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, tasksStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateTaskSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await tasksStore.requireById(params.id);
    const next = { ...current, ...parsed.data, updatedAt: nowIso() };
    await tasksStore.upsert(next);
    return NextResponse.json({ task: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Task not found');
    }
    throw err;
  }
}
