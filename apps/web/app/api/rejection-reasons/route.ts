import { NextResponse } from 'next/server';

import { createRejectionReasonSchema, type RejectionReason } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { rejectionReasonsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  const items = await rejectionReasonsStore.list();
  items.sort((a, b) => a.label.localeCompare(b.label));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, createRejectionReasonSchema);
  if (!parsed.success) return parsed.response;

  const reason: RejectionReason = {
    id: generateId('rej'),
    label: parsed.data.label,
    active: parsed.data.active,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await rejectionReasonsStore.upsert(reason);
  return NextResponse.json({ reason }, { status: 201 });
}
