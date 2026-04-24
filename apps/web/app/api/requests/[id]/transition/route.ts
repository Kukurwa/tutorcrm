import { NextResponse } from 'next/server';

import { transitionRequestSchema, type Request as Req } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { validateTransition } from '@/lib/funnel/state-machine';
import {
  MockStoreError,
  requestsStore,
  rejectionReasonsStore,
  tutorsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, transitionRequestSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await requestsStore.requireById(params.id);
    if (guard.session.user.role === 'dispatcher' && current.dispatcherId !== guard.session.user.id) {
      return errorResponse('FORBIDDEN', 'Not your request');
    }

    const check = validateTransition({
      from: current.stage,
      to: parsed.data.to,
      rejectionReasonId: parsed.data.rejectionReasonId,
      tutorId: parsed.data.tutorId,
    });
    if (!check.ok) {
      return errorResponse('CONFLICT', check.error);
    }

    if (parsed.data.rejectionReasonId) {
      const reason = await rejectionReasonsStore.findById(parsed.data.rejectionReasonId);
      if (!reason) {
        return errorResponse('VALIDATION_ERROR', 'Rejection reason not found');
      }
    }
    if (parsed.data.tutorId) {
      const tutor = await tutorsStore.findById(parsed.data.tutorId);
      if (!tutor) {
        return errorResponse('VALIDATION_ERROR', 'Tutor not found');
      }
    }

    const next: Req = {
      ...current,
      stage: parsed.data.to,
      rejectionReasonId: parsed.data.rejectionReasonId ?? current.rejectionReasonId,
      assignedTutorId: parsed.data.tutorId ?? current.assignedTutorId,
      updatedAt: nowIso(),
    };
    await requestsStore.upsert(next);
    return NextResponse.json({ request: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Request not found');
    }
    throw err;
  }
}
