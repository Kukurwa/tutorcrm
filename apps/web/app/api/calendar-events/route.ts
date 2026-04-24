import { NextResponse } from 'next/server';

import { createCalendarEventSchema, type CalendarEvent } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { calendarEventsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const rows = await calendarEventsStore.list();
  rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createCalendarEventSchema);
  if (!parsed.success) return parsed.response;

  const event: CalendarEvent = {
    id: generateId('cal'),
    kind: parsed.data.kind,
    title: parsed.data.title,
    startAt: parsed.data.startAt,
    endAt: parsed.data.endAt,
    contractId: parsed.data.contractId,
    requestId: parsed.data.requestId,
    tutorId: parsed.data.tutorId,
    clientId: parsed.data.clientId,
    note: parsed.data.note,
    createdAt: nowIso(),
  };
  await calendarEventsStore.upsert(event);
  return NextResponse.json({ event }, { status: 201 });
}
