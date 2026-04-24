import { NextResponse } from 'next/server';

import { createMessageTemplateSchema, type MessageTemplate } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { messageTemplatesStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  const items = await messageTemplatesStore.list();
  items.sort((a, b) => a.title.localeCompare(b.title));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createMessageTemplateSchema);
  if (!parsed.success) return parsed.response;

  const tpl: MessageTemplate = {
    id: generateId('tpl'),
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    variables: parsed.data.variables,
    active: parsed.data.active,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await messageTemplatesStore.upsert(tpl);
  return NextResponse.json({ template: tpl }, { status: 201 });
}
