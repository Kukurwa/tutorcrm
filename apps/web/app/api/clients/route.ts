import { NextResponse } from 'next/server';

import {
  createClientSchema,
  listClientsQuerySchema,
  type Client,
  type ClientContact,
  type ClientWithContacts,
} from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson, parseSearchParams } from '@/lib/api/response';
import { normalizePhone } from '@/lib/phone';
import { clientContactsStore, clientsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const parsed = parseSearchParams(url, listClientsQuerySchema);
  if (!parsed.success) return parsed.response;
  const { page, pageSize, q, dispatcherId: filterDispatcher } = parsed.data;

  let rows = await clientsStore.list();

  if (guard.session.user.role === 'dispatcher') {
    rows = rows.filter((c) => c.dispatcherId === guard.session.user.id);
  } else if (filterDispatcher) {
    rows = rows.filter((c) => c.dispatcherId === filterDispatcher);
  }

  if (q && q.trim()) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.phone ? c.phone.includes(needle) : false),
    );
  }

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const contacts = await clientContactsStore.list();
  const items: ClientWithContacts[] = pageRows.map((c) => ({
    ...c,
    contacts: contacts.filter((x) => x.clientId === c.id),
  }));

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    hasMore: start + pageSize < total,
  });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher', 'leadgen');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createClientSchema);
  if (!parsed.success) return parsed.response;

  const phone = normalizePhone(parsed.data.phone);

  // Dup-check на телефон
  const existing = await clientsStore.list();
  if (phone) {
    const dup = existing.find((c) => c.phone === phone);
    if (dup) {
      return NextResponse.json(
        {
          duplicate: true,
          client: dup,
        },
        { status: 409 },
      );
    }
  }

  const client: Client = {
    id: generateId('cli'),
    name: parsed.data.name,
    phone,
    note: parsed.data.note,
    createdBy: guard.session.user.id,
    dispatcherId: parsed.data.dispatcherId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await clientsStore.upsert(client);

  // attach contacts
  for (const c of parsed.data.contacts) {
    const contact: ClientContact = {
      id: generateId('cc'),
      clientId: client.id,
      kind: c.kind,
      value: c.value,
      primary: c.primary,
    };
    await clientContactsStore.upsert(contact);
  }

  const contacts = (await clientContactsStore.list()).filter((c) => c.clientId === client.id);
  return NextResponse.json({ client: { ...client, contacts } }, { status: 201 });
}
