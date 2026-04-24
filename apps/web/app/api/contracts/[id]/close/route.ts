import { NextResponse } from 'next/server';

import { closeContractSchema, type Contract, type ContractEvent } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { contractEventsStore, contractsStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;
  const parsed = await parseJson(req, closeContractSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await contractsStore.requireById(params.id);
    if (current.status === 'closed_won' || current.status === 'closed_lost') {
      return errorResponse('CONFLICT', 'Contract already closed');
    }
    const next: Contract = {
      ...current,
      status: 'closed_won',
      closedAt: nowIso(),
      closeReason: parsed.data.reason,
      updatedAt: nowIso(),
    };
    await contractsStore.upsert(next);
    const event: ContractEvent = {
      id: generateId('cev'),
      contractId: current.id,
      kind: 'closed',
      note: parsed.data.reason,
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
