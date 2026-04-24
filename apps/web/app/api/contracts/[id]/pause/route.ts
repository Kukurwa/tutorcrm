import { NextResponse } from 'next/server';

import { pauseContractSchema, type Contract, type ContractEvent } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import {
  contractEventsStore,
  contractsStore,
  MockStoreError,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;
  const parsed = await parseJson(req, pauseContractSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await contractsStore.requireById(params.id);
    if (current.status !== 'active') {
      return errorResponse('CONFLICT', 'Contract must be active to pause');
    }
    const next: Contract = {
      ...current,
      status: 'paused',
      pausedAt: nowIso(),
      updatedAt: nowIso(),
    };
    await contractsStore.upsert(next);
    const event: ContractEvent = {
      id: generateId('cev'),
      contractId: current.id,
      kind: 'paused',
      note: parsed.data.note ?? null,
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
