import { NextResponse } from 'next/server';

import { requireApiSession } from '@/lib/api/guards';
import { errorResponse } from '@/lib/api/response';
import {
  contractEventsStore,
  contractsStore,
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
    const [events, weeklyAll] = await Promise.all([
      contractEventsStore.list(),
      weeklyLessonCountsStore.list(),
    ]);
    return NextResponse.json({
      contract,
      events: events
        .filter((e) => e.contractId === contract.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      weeklyCounts: weeklyAll
        .filter((w) => w.contractId === contract.id)
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Contract not found');
    }
    throw err;
  }
}
