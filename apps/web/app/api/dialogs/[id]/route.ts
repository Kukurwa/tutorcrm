import { NextResponse } from 'next/server';

import { requireApiSession } from '@/lib/api/guards';
import { errorResponse } from '@/lib/api/response';
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

    // Mark as read on open
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
