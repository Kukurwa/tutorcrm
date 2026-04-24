import { NextResponse } from 'next/server';

import { createNotificationSchema, type Notification } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { notificationsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  const all = await notificationsStore.list();
  const mine = all
    .filter((n) => n.userId === guard.session.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ items: mine });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createNotificationSchema);
  if (!parsed.success) return parsed.response;

  const n: Notification = {
    id: generateId('ntf'),
    userId: parsed.data.userId,
    category: parsed.data.category,
    title: parsed.data.title,
    body: parsed.data.body,
    link: parsed.data.link,
    read: false,
    createdAt: nowIso(),
  };
  await notificationsStore.upsert(n);
  return NextResponse.json({ notification: n }, { status: 201 });
}
