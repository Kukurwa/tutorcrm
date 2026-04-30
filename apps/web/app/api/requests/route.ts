import { NextResponse } from 'next/server';

import {
  createRequestSchema,
  listRequestsQuerySchema,
  type Request as Req,
} from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson, parseSearchParams } from '@/lib/api/response';
import { clientsStore, requestsStore, subjectsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const parsed = parseSearchParams(new URL(req.url), listRequestsQuerySchema);
  if (!parsed.success) return parsed.response;
  const { page, pageSize, q, stage, dispatcherId: filterDispatcher, subjectId } = parsed.data;

  let rows = await requestsStore.list();
  if (guard.session.user.role === 'dispatcher') {
    rows = rows.filter((r) => r.dispatcherId === guard.session.user.id);
  } else if (filterDispatcher) {
    rows = rows.filter((r) => r.dispatcherId === filterDispatcher);
  }
  if (stage) rows = rows.filter((r) => r.stage === stage);
  if (subjectId) rows = rows.filter((r) => r.subjectId === subjectId);
  if (q && q.trim()) {
    const n = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.clientName.toLowerCase().includes(n) ||
        r.description.toLowerCase().includes(n) ||
        (r.subjectName ?? '').toLowerCase().includes(n) ||
        (r.studentName ?? '').toLowerCase().includes(n),
    );
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return NextResponse.json({
    items: rows.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    hasMore: start + pageSize < total,
  });
}

export async function POST(request: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(request, createRequestSchema);
  if (!parsed.success) return parsed.response;

  const client = await clientsStore.findById(parsed.data.clientId);
  if (!client) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Client not found' } },
      { status: 404 },
    );
  }
  const subject = parsed.data.subjectId
    ? await subjectsStore.findById(parsed.data.subjectId)
    : null;

  const row: Req = {
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
    dispatcherId:
      guard.session.user.role === 'dispatcher' ? guard.session.user.id : client.dispatcherId,
    publishedChannels: [],
    publishedAt: null,
    republishedAt: null,
    republishCount: 0,
    assignedTutorId: null,
    rejectionReasonId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await requestsStore.upsert(row);
  return NextResponse.json({ request: row }, { status: 201 });
}
