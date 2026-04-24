import { NextResponse } from 'next/server';

import { createScriptSchema, type Script } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { scriptsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  const items = await scriptsStore.list();
  items.sort((a, b) => a.title.localeCompare(b.title));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createScriptSchema);
  if (!parsed.success) return parsed.response;

  const script: Script = {
    id: generateId('scr'),
    title: parsed.data.title,
    body: parsed.data.body,
    stageKind: parsed.data.stageKind,
    active: parsed.data.active,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await scriptsStore.upsert(script);
  return NextResponse.json({ script }, { status: 201 });
}
