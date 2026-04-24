import { NextResponse } from 'next/server';

import { updateInvoiceAmountSchema, type InvoiceEvent } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { invoiceEventsStore, invoicesStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, updateInvoiceAmountSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await invoicesStore.requireById(params.id);
    if (current.status !== 'draft' && current.status !== 'sent') {
      return errorResponse('CONFLICT', 'Can only edit draft or sent invoices');
    }
    const next = { ...current, amount: parsed.data.amount, updatedAt: nowIso() };
    await invoicesStore.upsert(next);
    const event: InvoiceEvent = {
      id: generateId('iev'),
      invoiceId: current.id,
      kind: 'amount_changed',
      note: `${current.amount} → ${parsed.data.amount}`,
      actorId: guard.session.user.id,
      createdAt: nowIso(),
    };
    await invoiceEventsStore.upsert(event);
    return NextResponse.json({ invoice: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Invoice not found');
    }
    throw err;
  }
}
