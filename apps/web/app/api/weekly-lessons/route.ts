import { NextResponse } from 'next/server';

import { submitWeeklyLessonsSchema, type WeeklyLessonCount } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { contractsStore, weeklyLessonCountsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, submitWeeklyLessonsSchema);
  if (!parsed.success) return parsed.response;

  const contract = await contractsStore.findById(parsed.data.contractId);
  if (!contract) return errorResponse('NOT_FOUND', 'Contract not found');

  const all = await weeklyLessonCountsStore.list();
  const existing = all.find(
    (w) => w.contractId === parsed.data.contractId && w.weekStart === parsed.data.weekStart,
  );
  const row: WeeklyLessonCount = {
    id: existing?.id ?? generateId('wlc'),
    contractId: parsed.data.contractId,
    weekStart: parsed.data.weekStart,
    count: parsed.data.count,
    enteredAt: nowIso(),
    enteredBy: guard.session.user.id,
  };
  await weeklyLessonCountsStore.upsert(row);
  return NextResponse.json({ row }, { status: existing ? 200 : 201 });
}
