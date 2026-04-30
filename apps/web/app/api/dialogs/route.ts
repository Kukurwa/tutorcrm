import { NextResponse } from 'next/server';

import type { Dialog } from '@tutorcrm/contracts';

import { requireApiSession } from '@/lib/api/guards';
import { dialogsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const stage = url.searchParams.get('stage');
  const channel = url.searchParams.get('channel');
  const partyKind = url.searchParams.get('partyKind');
  const folderId = url.searchParams.get('folderId');
  const q = url.searchParams.get('q')?.toLowerCase() ?? '';
  const mine = url.searchParams.get('mine') === '1';

  let rows: Dialog[] = await dialogsStore.list();

  if (guard.session.user.role === 'dispatcher' || mine) {
    rows = rows.filter((d) => d.dispatcherId === guard.session.user.id || d.dispatcherId === null);
  }
  if (stage) rows = rows.filter((d) => d.stage === stage);
  if (channel) rows = rows.filter((d) => d.channel === channel);
  if (partyKind) rows = rows.filter((d) => d.partyKind === partyKind);
  if (folderId) rows = rows.filter((d) => d.folderId === folderId);
  if (q) {
    rows = rows.filter(
      (d) =>
        d.clientName.toLowerCase().includes(q) || d.lastMessagePreview.toLowerCase().includes(q),
    );
  }

  rows.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  return NextResponse.json({ items: rows });
}
