import { NextResponse } from 'next/server';

import { markNotificationsReadSchema } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { parseJson } from '@/lib/api/response';
import { notificationsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, markNotificationsReadSchema);
  if (!parsed.success) return parsed.response;

  const all = await notificationsStore.list();
  const mine = all.filter((n) => n.userId === guard.session.user.id);
  const ids = parsed.data.ids ?? mine.map((n) => n.id);

  for (const n of mine.filter((x) => ids.includes(x.id))) {
    await notificationsStore.upsert({ ...n, read: true });
  }

  return NextResponse.json({ ok: true });
}
