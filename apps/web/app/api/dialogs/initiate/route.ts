import { NextResponse } from 'next/server';

import { initiateDialogSchema, type Dialog, type Message } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { clientsStore, dialogsStore, messagesStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, initiateDialogSchema);
  if (!parsed.success) return parsed.response;

  let clientName = parsed.data.contact;
  if (parsed.data.clientId) {
    try {
      const client = await clientsStore.requireById(parsed.data.clientId);
      clientName = client.name;
    } catch {
      /* noop */
    }
  }

  const dialog: Dialog = {
    id: generateId('dlg'),
    channel: parsed.data.channel,
    externalId: `mock_${parsed.data.channel}_${parsed.data.contact}`,
    clientId: parsed.data.clientId,
    clientName,
    dispatcherId: guard.session.user.id,
    stage: 'new_dialog',
    leadId: null,
    requestId: null,
    unread: 0,
    lastMessagePreview: parsed.data.firstMessage.slice(0, 80),
    lastMessageAt: nowIso(),
    slaDueAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await dialogsStore.upsert(dialog);

  const message: Message = {
    id: generateId('msg'),
    dialogId: dialog.id,
    direction: 'out',
    text: parsed.data.firstMessage,
    authorName: guard.session.user.name,
    sentAt: nowIso(),
    read: true,
  };
  await messagesStore.upsert(message);

  return NextResponse.json({ dialog, message }, { status: 201 });
}
