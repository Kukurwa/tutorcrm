import { NextResponse } from 'next/server';

import {
  createContractSchema,
  type Contract,
  type ContractEvent,
} from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import {
  contractEventsStore,
  contractsStore,
  requestsStore,
  tutorsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  let rows = await contractsStore.list();
  if (guard.session.user.role === 'dispatcher') {
    rows = rows.filter((c) => c.dispatcherId === guard.session.user.id);
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createContractSchema);
  if (!parsed.success) return parsed.response;

  const request = await requestsStore.findById(parsed.data.requestId);
  if (!request) return errorResponse('NOT_FOUND', 'Request not found');
  const tutor = await tutorsStore.findById(parsed.data.tutorId);
  if (!tutor) return errorResponse('NOT_FOUND', 'Tutor not found');

  const contract: Contract = {
    id: generateId('con'),
    requestId: request.id,
    clientId: request.clientId,
    clientName: request.clientName,
    tutorId: tutor.id,
    tutorName: tutor.name,
    subjectId: request.subjectId,
    subjectName: request.subjectName,
    hourlyRate: parsed.data.hourlyRate,
    commissionRate: parsed.data.commissionRate,
    status: 'active',
    startedAt: nowIso(),
    pausedAt: null,
    closedAt: null,
    closeReason: null,
    dispatcherId: request.dispatcherId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await contractsStore.upsert(contract);

  const event: ContractEvent = {
    id: generateId('cev'),
    contractId: contract.id,
    kind: 'created',
    note: null,
    createdAt: nowIso(),
  };
  await contractEventsStore.upsert(event);

  return NextResponse.json({ contract }, { status: 201 });
}
