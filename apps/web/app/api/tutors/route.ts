import { NextResponse } from 'next/server';

import { createTutorSchema, type Tutor } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { tutorsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  const items = await tutorsStore.list();
  items.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createTutorSchema);
  if (!parsed.success) return parsed.response;

  const tutor: Tutor = {
    id: generateId('tut'),
    name: parsed.data.name,
    phone: parsed.data.phone,
    experienceYears: parsed.data.experienceYears,
    subjects: parsed.data.subjects,
    hourlyRate: parsed.data.hourlyRate,
    note: parsed.data.note,
    status: parsed.data.status,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await tutorsStore.upsert(tutor);
  return NextResponse.json({ tutor }, { status: 201 });
}
