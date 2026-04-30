import { NextResponse } from 'next/server';

import { createSubjectSchema, type Subject, type SubjectWithChannels } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { subjectChannelsStore, subjectsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const [subjects, channels] = await Promise.all([
    subjectsStore.list(),
    subjectChannelsStore.list(),
  ]);
  const result: SubjectWithChannels[] = subjects
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({ ...s, channels: channels.filter((c) => c.subjectId === s.id) }));

  return NextResponse.json({ items: result });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createSubjectSchema);
  if (!parsed.success) return parsed.response;

  const subject: Subject = {
    id: generateId('subj'),
    name: parsed.data.name,
    code: parsed.data.code,
    contractCode: parsed.data.contractCode,
    active: parsed.data.active,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await subjectsStore.upsert(subject);
  return NextResponse.json({ subject }, { status: 201 });
}
