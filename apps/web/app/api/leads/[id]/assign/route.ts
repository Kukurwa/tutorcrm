import { NextResponse } from 'next/server';

import { assignLeadSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { clientsStore, leadsStore, MockStoreError, usersStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, assignLeadSchema);
  if (!parsed.success) return parsed.response;

  try {
    const dispatcher = await usersStore.requireById(parsed.data.dispatcherId);
    if (dispatcher.role !== 'dispatcher') {
      return errorResponse('VALIDATION_ERROR', 'User is not a dispatcher');
    }
    const lead = await leadsStore.requireById(params.id);
    const nextLead = {
      ...lead,
      dispatcherId: dispatcher.id,
      status: 'assigned' as const,
      updatedAt: nowIso(),
    };
    await leadsStore.upsert(nextLead);

    if (lead.clientId) {
      const client = await clientsStore.requireById(lead.clientId);
      await clientsStore.upsert({
        ...client,
        dispatcherId: dispatcher.id,
        updatedAt: nowIso(),
      });
    }

    return NextResponse.json({ lead: nextLead });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', err.message);
    }
    throw err;
  }
}
