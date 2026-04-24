import { NextResponse } from 'next/server';

import { updateClientSchema, type ClientWithContacts } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { normalizePhone } from '@/lib/phone';
import { clientContactsStore, clientsStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  try {
    const client = await clientsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      client.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your client');
    }
    const contacts = (await clientContactsStore.list()).filter((c) => c.clientId === client.id);
    const full: ClientWithContacts = { ...client, contacts };
    return NextResponse.json({ client: full });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Client not found');
    }
    throw err;
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateClientSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await clientsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      current.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your client');
    }
    const phonePatch =
      parsed.data.phone === undefined ? {} : { phone: normalizePhone(parsed.data.phone) };
    const next = {
      ...current,
      ...parsed.data,
      ...phonePatch,
      updatedAt: nowIso(),
    };
    await clientsStore.upsert(next);
    return NextResponse.json({ client: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Client not found');
    }
    throw err;
  }
}
