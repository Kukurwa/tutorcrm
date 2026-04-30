import { NextResponse } from 'next/server';

import { updateDialogSchema, type Dialog } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { dialogsStore, MockStoreError, messagesStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  try {
    const dialog = await dialogsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      dialog.dispatcherId &&
      dialog.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your dialog');
    }
    const all = await messagesStore.list();
    const msgs = all
      .filter((m) => m.dialogId === dialog.id)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));

    if (dialog.unread > 0) {
      await dialogsStore.upsert({ ...dialog, unread: 0 });
    }
    for (const m of msgs.filter((x) => x.direction === 'in' && !x.read)) {
      await messagesStore.upsert({ ...m, read: true });
    }

    return NextResponse.json({ dialog: { ...dialog, unread: 0 }, messages: msgs });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Dialog not found');
    }
    throw err;
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateDialogSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await dialogsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      current.dispatcherId &&
      current.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your dialog');
    }
    const next: Dialog = {
      ...current,
      ...parsed.data,
      updatedAt: nowIso(),
    };
    await dialogsStore.upsert(next);
    return NextResponse.json({ dialog: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Dialog not found');
    }
    throw err;
  }
}
