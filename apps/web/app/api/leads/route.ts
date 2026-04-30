import { NextResponse } from 'next/server';

import { createLeadSchema, type Client, type Lead } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { normalizePhone } from '@/lib/phone';
import { clientsStore, leadsStore, usersStore } from '@/mocks/store';

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

// Простое round-robin авто-распределение между активными диспетчерами.
async function pickDispatcher(): Promise<string | null> {
  const users = await usersStore.list();
  const dispatchers = users.filter((u) => u.role === 'dispatcher' && u.status === 'active');
  if (dispatchers.length === 0 || !dispatchers[0]) return null;
  const leads = await leadsStore.list();
  const counts = new Map<string, number>();
  for (const d of dispatchers) counts.set(d.id, 0);
  for (const l of leads) {
    if (l.dispatcherId && counts.has(l.dispatcherId)) {
      counts.set(l.dispatcherId, (counts.get(l.dispatcherId) ?? 0) + 1);
    }
  }
  let pick: string = dispatchers[0].id;
  let min = counts.get(pick) ?? 0;
  for (const [id, c] of counts) {
    if (c < min) {
      pick = id;
      min = c;
    }
  }
  return pick;
}

// Извлекаем из свободного текста имя — первая «человекообразная» строка/начало текста.
function extractName(text: string): string {
  const firstLine = (text.split('\n')[0] ?? '').trim();
  return firstLine.length > 0 ? firstLine.slice(0, 80) : 'Без имени';
}

function looksLikePhone(value: string): boolean {
  return /[\d+]/.test(value) && value.replace(/\D/g, '').length >= 9;
}

export async function POST(req: Request) {
  const guard = await requireApiRole('leadgen', 'admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createLeadSchema);
  if (!parsed.success) return parsed.response;

  const text = parsed.data.text.trim();
  const contact = parsed.data.contact.trim();
  const phone = looksLikePhone(contact) ? normalizePhone(contact) : null;
  const clientName = extractName(text);

  const existingClients = await clientsStore.list();
  const duplicate = phone ? existingClients.find((c) => c.phone === phone) : undefined;

  let clientId: string | null = duplicate?.id ?? null;
  if (!duplicate) {
    const client: Client = {
      id: generateId('cli'),
      name: clientName,
      phone,
      note: text,
      createdBy: guard.session.user.id,
      dispatcherId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await clientsStore.upsert(client);
    clientId = client.id;
  }

  let dispatcherId = parsed.data.dispatcherId;
  let autoAssigned = false;
  if (parsed.data.autoAssign) {
    dispatcherId = await pickDispatcher();
    autoAssigned = true;
  }

  const lead: Lead = {
    id: generateId('lead'),
    text,
    contact,
    clientName,
    phone,
    subject: null,
    note: text,
    status: dispatcherId ? 'assigned' : 'new',
    autoAssigned,
    createdBy: guard.session.user.id,
    dispatcherId,
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
