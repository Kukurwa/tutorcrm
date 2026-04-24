import { NextResponse } from 'next/server';

import { recordOneTimePaymentSchema, type OneTimeDealPayment } from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { parseJson } from '@/lib/api/response';
import { oneTimePaymentsStore } from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;
  const items = await oneTimePaymentsStore.list();
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, recordOneTimePaymentSchema);
  if (!parsed.success) return parsed.response;

  const payment: OneTimeDealPayment = {
    id: generateId('otp'),
    requestId: parsed.data.requestId,
    amount: parsed.data.amount,
    status: parsed.data.status,
    paidAt: parsed.data.status === 'paid' ? nowIso() : null,
    note: parsed.data.note,
    createdAt: nowIso(),
  };
  await oneTimePaymentsStore.upsert(payment);
  return NextResponse.json({ payment }, { status: 201 });
}
