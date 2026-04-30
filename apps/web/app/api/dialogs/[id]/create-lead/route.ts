import { NextResponse } from 'next/server';

import {
  createLeadFromDialogSchema,
  type Client,
  type Dialog,
  type Lead,
} from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { normalizePhone } from '@/lib/phone';
import {
  clientsStore,
  dialogsStore,
  leadsStore,
  MockStoreError,
  subjectsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createLeadFromDialogSchema);
  if (!parsed.success) return parsed.response;

  try {
    const dialog = await dialogsStore.requireById(params.id);
    const phone = normalizePhone(parsed.data.phone);
    const subject = parsed.data.subjectId
      ? await subjectsStore.findById(parsed.data.subjectId)
      : null;
    const subjectName = subject?.name ?? null;

    let clientId = dialog.clientId;
    if (!clientId) {
      const clients = await clientsStore.list();
      const existing = phone ? clients.find((c) => c.phone === phone) : undefined;
      if (existing) {
        clientId = existing.id;
      } else {
        const client: Client = {
          id: generateId('cli'),
          name: parsed.data.clientName,
          phone,
          note: parsed.data.note,
          createdBy: guard.session.user.id,
          dispatcherId: guard.session.user.id,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await clientsStore.upsert(client);
        clientId = client.id;
      }
    }

    const text = [parsed.data.clientName, subjectName, parsed.data.note]
      .filter(Boolean)
      .join(' · ');
    const lead: Lead = {
      id: generateId('lead'),
      text: text || parsed.data.clientName,
      contact: phone ?? parsed.data.clientName,
      clientName: parsed.data.clientName,
      phone,
      subject: subjectName,
      note: parsed.data.note,
      status: 'assigned',
      autoAssigned: false,
      createdBy: guard.session.user.id,
      dispatcherId: guard.session.user.id,
      clientId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await leadsStore.upsert(lead);

    const nextDialog: Dialog = {
      ...dialog,
      clientId,
      stage: 'lead_created',
      leadId: lead.id,
      dispatcherId: dialog.dispatcherId ?? guard.session.user.id,
      updatedAt: nowIso(),
    };
    await dialogsStore.upsert(nextDialog);

    return NextResponse.json({ lead, dialog: nextDialog }, { status: 201 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Dialog not found');
    }
    throw err;
  }
}
