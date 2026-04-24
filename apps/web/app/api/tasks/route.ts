import { NextResponse } from 'next/server';

import { createTaskSchema, type Task } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { tasksStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const mine = url.searchParams.get('mine') === '1';
  const status = url.searchParams.get('status');

  let rows = await tasksStore.list();
  if (guard.session.user.role === 'dispatcher' || mine) {
    rows = rows.filter(
      (t) => t.assignedToId === guard.session.user.id || t.assignedToId === null,
    );
  }
  if (status) rows = rows.filter((t) => t.status === status);
  rows.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createTaskSchema);
  if (!parsed.success) return parsed.response;

  const task: Task = {
    id: generateId('task'),
    kind: parsed.data.kind,
    title: parsed.data.title,
    note: parsed.data.note,
    dueAt: parsed.data.dueAt,
    assignedToId: parsed.data.assignedToId ?? guard.session.user.id,
    status: 'open',
    snoozedUntil: null,
    relatedRequestId: parsed.data.relatedRequestId,
    relatedContractId: parsed.data.relatedContractId,
    relatedDialogId: parsed.data.relatedDialogId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await tasksStore.upsert(task);
  return NextResponse.json({ task }, { status: 201 });
}
