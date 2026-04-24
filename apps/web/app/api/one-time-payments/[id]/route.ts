import { NextResponse } from 'next/server';

import { updateOneTimePaymentSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { MockStoreError, oneTimePaymentsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateOneTimePaymentSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await oneTimePaymentsStore.requireById(params.id);
    const next = {
      ...current,
      ...parsed.data,
      paidAt:
        parsed.data.status === 'paid'
          ? nowIso()
          : parsed.data.status === 'pending' || parsed.data.status === 'missed'
            ? null
            : current.paidAt,
    };
    await oneTimePaymentsStore.upsert(next);
    return NextResponse.json({ payment: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Payment not found');
    }
    throw err;
  }
}
