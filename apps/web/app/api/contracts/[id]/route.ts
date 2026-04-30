import { NextResponse } from 'next/server';

import { updateContractSchema, type Contract } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import {
  contractEventsStore,
  contractsStore,
  lessonsStore,
  MockStoreError,
  weeklyLessonCountsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  try {
    const contract = await contractsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      contract.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your contract');
    }
    const [events, weeklyAll, lessonsAll] = await Promise.all([
      contractEventsStore.list(),
      weeklyLessonCountsStore.list(),
      lessonsStore.list(),
    ]);
    return NextResponse.json({
      contract,
      events: events
        .filter((e) => e.contractId === contract.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      weeklyCounts: weeklyAll
        .filter((w) => w.contractId === contract.id)
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
      lessons: lessonsAll
        .filter((l) => l.contractId === contract.id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Contract not found');
    }
    throw err;
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateContractSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await contractsStore.requireById(params.id);
    if (
      guard.session.user.role === 'dispatcher' &&
      current.dispatcherId !== guard.session.user.id
    ) {
      return errorResponse('FORBIDDEN', 'Not your contract');
    }
    const next: Contract = {
      ...current,
      ...parsed.data,
      updatedAt: nowIso(),
    };
    await contractsStore.upsert(next);
    return NextResponse.json({ contract: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Contract not found');
    }
    throw err;
  }
}
