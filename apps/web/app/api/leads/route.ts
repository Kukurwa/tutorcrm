import { NextResponse } from 'next/server';

import {
  createLeadSchema,
  type Client,
  type Lead,
} from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { normalizePhone } from '@/lib/phone';
import { clientsStore, leadsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  let rows = await leadsStore.list();
  if (guard.session.user.role === 'leadgen') {
    rows = rows.filter((l) => l.createdBy === guard.session.user.id);
  } else if (guard.session.user.role === 'dispatcher') {
    rows = rows.filter((l) => l.dispatcherId === guard.session.user.id);
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('leadgen', 'admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createLeadSchema);
  if (!parsed.success) return parsed.response;

  const phone = normalizePhone(parsed.data.phone);

  const existingClients = await clientsStore.list();
  const duplicate = phone
    ? existingClients.find((c) => c.phone === phone)
    : undefined;

  let clientId: string | null = duplicate?.id ?? null;
  if (!duplicate) {
    const client: Client = {
      id: generateId('cli'),
      name: parsed.data.clientName,
      phone,
      note: parsed.data.note,
      createdBy: guard.session.user.id,
      dispatcherId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await clientsStore.upsert(client);
    clientId = client.id;
  }

  const lead: Lead = {
    id: generateId('lead'),
    clientName: parsed.data.clientName,
    phone,
    subject: parsed.data.subject,
    note: parsed.data.note,
    status: 'new',
    createdBy: guard.session.user.id,
    dispatcherId: null,
    clientId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await leadsStore.upsert(lead);

  return NextResponse.json(
    {
      lead,
      duplicateClientId: duplicate?.id ?? null,
    },
    { status: 201 },
  );
}
