import { NextResponse } from 'next/server';

import { reorderFunnelStagesSchema } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { funnelStagesStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, reorderFunnelStagesSchema);
  if (!parsed.success) return parsed.response;

  const all = await funnelStagesStore.list();
  const byId = new Map(all.map((s) => [s.id, s]));

  if (parsed.data.order.some((id) => !byId.has(id))) {
    return errorResponse('VALIDATION_ERROR', 'Unknown stage id in order array');
  }
  if (parsed.data.order.length !== all.length) {
    return errorResponse('VALIDATION_ERROR', 'Order must include every stage exactly once');
  }

  const now = nowIso();
  for (let i = 0; i < parsed.data.order.length; i += 1) {
    const id = parsed.data.order[i];
    if (!id) continue;
    const stage = byId.get(id)!;
    await funnelStagesStore.upsert({ ...stage, order: i, updatedAt: now });
  }

  const next = (await funnelStagesStore.list()).sort((a, b) => a.order - b.order);
  return NextResponse.json({ items: next });
}
