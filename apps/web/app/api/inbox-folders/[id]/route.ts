import { NextResponse } from 'next/server';

import { requireApiRole } from '@/lib/api/guards';
import { errorResponse } from '@/lib/api/response';
import { inboxFoldersStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  try {
    const folder = await inboxFoldersStore.requireById(params.id);
    if (guard.session.user.role !== 'admin' && folder.ownerId !== guard.session.user.id) {
      return errorResponse('FORBIDDEN', 'Not your folder');
    }
    await inboxFoldersStore.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Folder not found');
    }
    throw err;
  }
}
