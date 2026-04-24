import { NextResponse } from 'next/server';

import { replaceTutorSchema, type Contract, type ContractEvent } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import {
  contractEventsStore,
  contractsStore,
  MockStoreError,
  tutorsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, replaceTutorSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await contractsStore.requireById(params.id);
    const tutor = await tutorsStore.findById(parsed.data.tutorId);
    if (!tutor) return errorResponse('NOT_FOUND', 'Tutor not found');

    const next: Contract = {
      ...current,
      tutorId: tutor.id,
      tutorName: tutor.name,
      updatedAt: nowIso(),
    };
    await contractsStore.upsert(next);
    const event: ContractEvent = {
      id: generateId('cev'),
      contractId: current.id,
      kind: 'tutor_replaced',
      note: parsed.data.note ?? `Замена: ${current.tutorName} → ${tutor.name}`,
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
