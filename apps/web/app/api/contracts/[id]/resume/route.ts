import { NextResponse } from 'next/server';

import type { Contract, ContractEvent } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse } from '@/lib/api/response';
import { contractEventsStore, contractsStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(_req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  try {
    const current = await contractsStore.requireById(params.id);
    if (current.status !== 'paused') {
      return errorResponse('CONFLICT', 'Contract must be paused to resume');
    }
    const next: Contract = {
      ...current,
      status: 'active',
      pausedAt: null,
      updatedAt: nowIso(),
    };
    await contractsStore.upsert(next);
    const event: ContractEvent = {
      id: generateId('cev'),
      contractId: current.id,
      kind: 'resumed',
      note: null,
      createdAt: nowIso(),
    };
    await contractEventsStore.upsert(event);
    return NextResponse.json({ contract: next, event });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Contract not found');
    }
    throw err;
  }
}
