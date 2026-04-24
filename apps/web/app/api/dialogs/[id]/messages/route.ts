import { NextResponse } from 'next/server';

import { sendMessageSchema, type Message } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { dialogsStore, MockStoreError, messagesStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, sendMessageSchema);
  if (!parsed.success) return parsed.response;

  try {
    const dialog = await dialogsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      dialog.dispatcherId &&
      dialog.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your dialog');
    }

    const message: Message = {
      id: generateId('msg'),
      dialogId: dialog.id,
      direction: 'out',
      text: parsed.data.text,
      authorName: guard.session.user.name,
      sentAt: nowIso(),
      read: true,
    };
    await messagesStore.upsert(message);

    const nextDialog = {
      ...dialog,
      lastMessagePreview: parsed.data.text.slice(0, 80),
      lastMessageAt: message.sentAt,
      updatedAt: message.sentAt,
      dispatcherId: dialog.dispatcherId ?? guard.session.user.id,
      slaDueAt: null,
    };
    await dialogsStore.upsert(nextDialog);

    return NextResponse.json({ message, dialog: nextDialog }, { status: 201 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Dialog not found');
    }
    throw err;
  }
}
