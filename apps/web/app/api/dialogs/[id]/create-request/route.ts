import { NextResponse } from 'next/server';

import {
  createRequestFromDialogSchema,
  type Dialog,
  type Request as Req,
} from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import {
  clientsStore,
  dialogsStore,
  MockStoreError,
  requestsStore,
  subjectsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createRequestFromDialogSchema);
  if (!parsed.success) return parsed.response;

  try {
    const dialog = await dialogsStore.requireById(params.id);
    if (!dialog.clientId) {
      return errorResponse('VALIDATION_ERROR', 'Сначала создайте лид (нет clientId у диалога)');
    }
    const client = await clientsStore.findById(dialog.clientId);
    if (!client) {
      return errorResponse('NOT_FOUND', 'Client not found');
    }

    const subject = parsed.data.subjectId
      ? await subjectsStore.findById(parsed.data.subjectId)
      : null;

    const request: Req = {
      id: generateId('req'),
      clientId: client.id,
      clientName: client.name,
      subjectId: subject?.id ?? null,
      subjectName: subject?.name ?? null,
      dealType: parsed.data.dealType,
      description: parsed.data.description,
      studentName: parsed.data.studentName,
      age: parsed.data.age,
      grade: parsed.data.grade,
      schedule: parsed.data.schedule,
      pricePerHour: parsed.data.pricePerHour,
      requestPrice: parsed.data.requestPrice,
      extraInfo: parsed.data.extraInfo,
      budgetFrom: null,
      budgetTo: null,
      stage: 'request_created',
      dispatcherId: dialog.dispatcherId ?? guard.session.user.id,
      publishedChannels: [],
      publishedAt: null,
      republishedAt: null,
      republishCount: 0,
      assignedTutorId: null,
      rejectionReasonId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await requestsStore.upsert(request);

    const nextDialog: Dialog = {
      ...dialog,
      stage: 'request_created',
      requestId: request.id,
      updatedAt: nowIso(),
    };
    await dialogsStore.upsert(nextDialog);

    return NextResponse.json({ request, dialog: nextDialog }, { status: 201 });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Dialog not found');
    }
    throw err;
  }
}
