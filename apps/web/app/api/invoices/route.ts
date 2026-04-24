import { NextResponse } from 'next/server';

import {
  generateInvoicesSchema,
  type Invoice,
  type InvoiceEvent,
} from '@tutorcrm/contracts';

import { requireApiRole, requireApiSession } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import {
  contractsStore,
  getSystemSettings,
  invoiceEventsStore,
  invoicesStore,
  weeklyLessonCountsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const contractId = url.searchParams.get('contractId');
  const status = url.searchParams.get('status');

  let rows = await invoicesStore.list();
  if (contractId) rows = rows.filter((i) => i.contractId === contractId);
  if (status) rows = rows.filter((i) => i.status === status);
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, generateInvoicesSchema);
  if (!parsed.success) return parsed.response;

  const contract = await contractsStore.findById(parsed.data.contractId);
  if (!contract) return errorResponse('NOT_FOUND', 'Contract not found');
  const wlc = await weeklyLessonCountsStore.findById(parsed.data.weeklyCountId);
  if (!wlc) return errorResponse('NOT_FOUND', 'Weekly count not found');
  if (wlc.contractId !== contract.id) {
    return errorResponse('VALIDATION_ERROR', 'Weekly count does not belong to contract');
  }

  const settings = getSystemSettings();
  const clientAmount = wlc.count * contract.hourlyRate;
  const tutorAmount = Math.round(clientAmount * (1 - contract.commissionRate));

  const weekStart = wlc.weekStart;
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const periodEnd = end.toISOString().slice(0, 10);

  const due = new Date(periodEnd);
  due.setDate(due.getDate() + settings.invoiceDueDays);
  const dueDate = due.toISOString().slice(0, 10);

  const now = nowIso();

  function makeInvoice(recipient: 'client' | 'tutor', amount: number): Invoice {
    return {
      id: generateId('inv'),
      contractId: contract!.id,
      weeklyCountId: wlc!.id,
      recipient,
      amount,
      currency: settings.currency,
      periodStart: weekStart,
      periodEnd,
      dueDate,
      status: 'draft',
      sentAt: null,
      paidAt: null,
      skippedAt: null,
      note: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  const clientInvoice = makeInvoice('client', clientAmount);
  const tutorInvoice = makeInvoice('tutor', tutorAmount);
  await invoicesStore.upsert(clientInvoice);
  await invoicesStore.upsert(tutorInvoice);

  for (const inv of [clientInvoice, tutorInvoice]) {
    const ev: InvoiceEvent = {
      id: generateId('iev'),
      invoiceId: inv.id,
      kind: 'generated',
      note: null,
      actorId: guard.session.user.id,
      createdAt: now,
    };
    await invoiceEventsStore.upsert(ev);
  }

  return NextResponse.json({ client: clientInvoice, tutor: tutorInvoice }, { status: 201 });
}
