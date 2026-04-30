import { NextResponse } from 'next/server';

import { updateLessonSchema, type Lesson } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { errorResponse, parseJson } from '@/lib/api/response';
import { lessonsStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateLessonSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await lessonsStore.requireById(params.id);
    const next: Lesson = { ...current, ...parsed.data };
    await lessonsStore.upsert(next);
    return NextResponse.json({ lesson: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Lesson not found');
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;
  try {
    await lessonsStore.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Lesson not found');
    }
    throw err;
  }
}
