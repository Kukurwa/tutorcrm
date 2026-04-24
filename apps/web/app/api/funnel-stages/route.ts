import { NextResponse } from 'next/server';

import { createFunnelStageSchema, type FunnelStage } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { funnelStagesStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const items = await funnelStagesStore.list();
  items.sort((a, b) => a.order - b.order);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createFunnelStageSchema);
  if (!parsed.success) return parsed.response;

  const existing = await funnelStagesStore.list();
  const stage: FunnelStage = {
    id: generateId('stage'),
    kind: parsed.data.kind,
    name: parsed.data.name,
    order: existing.length,
    color: parsed.data.color,
    slaMinutes: parsed.data.slaMinutes,
    scriptId: parsed.data.scriptId,
    terminal: parsed.data.terminal,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await funnelStagesStore.upsert(stage);
  return NextResponse.json({ stage }, { status: 201 });
}
