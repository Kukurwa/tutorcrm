import { NextResponse } from 'next/server';

import { createLessonSchema, type Lesson } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { lessonsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const contractId = url.searchParams.get('contractId');
  let rows = await lessonsStore.list();
  if (contractId) rows = rows.filter((l) => l.contractId === contractId);
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createLessonSchema);
  if (!parsed.success) return parsed.response;

  const lesson: Lesson = {
    id: generateId('les'),
    contractId: parsed.data.contractId,
    date: parsed.data.date,
    status: parsed.data.status,
    note: parsed.data.note,
    createdAt: nowIso(),
  };
  await lessonsStore.upsert(lesson);
  return NextResponse.json({ lesson }, { status: 201 });
}
