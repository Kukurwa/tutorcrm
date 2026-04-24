import { NextResponse } from 'next/server';

import { createRequestResponseSchema, type RequestResponse } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { requestResponsesStore, requestsStore, tutorsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  const url = new URL(req.url);
  const requestId = url.searchParams.get('requestId');
  if (!requestId) return errorResponse('VALIDATION_ERROR', 'requestId required');

  const rows = await requestResponsesStore.list();
  const filtered = rows
    .filter((r) => r.requestId === requestId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return NextResponse.json({ items: filtered });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createRequestResponseSchema);
  if (!parsed.success) return parsed.response;

  const request = await requestsStore.findById(parsed.data.requestId);
  if (!request) return errorResponse('NOT_FOUND', 'Request not found');
  const tutor = await tutorsStore.findById(parsed.data.tutorId);
  if (!tutor) return errorResponse('NOT_FOUND', 'Tutor not found');

  const response: RequestResponse = {
    id: generateId('resp'),
    requestId: request.id,
    tutorId: tutor.id,
    tutorName: tutor.name,
    note: parsed.data.note,
    status: 'new',
    createdAt: nowIso(),
  };
  await requestResponsesStore.upsert(response);
  return NextResponse.json({ response }, { status: 201 });
}
