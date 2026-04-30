import { NextResponse } from 'next/server';

import { createInboxFolderSchema, type InboxFolder } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { inboxFoldersStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  let rows = await inboxFoldersStore.list();
  if (guard.session.user.role !== 'admin') {
    rows = rows.filter((f) => f.ownerId === guard.session.user.id);
  }
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createInboxFolderSchema);
  if (!parsed.success) return parsed.response;

  const folder: InboxFolder = {
    id: generateId('fld'),
    name: parsed.data.name,
    color: parsed.data.color,
    ownerId: guard.session.user.id,
    createdAt: nowIso(),
  };
  await inboxFoldersStore.upsert(folder);
  return NextResponse.json({ folder }, { status: 201 });
}
