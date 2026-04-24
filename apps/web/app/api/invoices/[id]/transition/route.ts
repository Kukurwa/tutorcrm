import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { InvoiceEvent, InvoiceStatus } from '@tutorcrm/contracts';

import { requireApiRole } from '@/lib/api/guards';
import { generateId, nowIso } from '@/lib/api/id';
import { errorResponse, parseJson } from '@/lib/api/response';
import { invoiceEventsStore, invoicesStore, MockStoreError } from '@/mocks/store';

export const dynamic = 'force-dynamic';

const transitionSchema = z.object({
  action: z.enum(['send', 'mark_paid', 'mark_overdue', 'skip']),
  note: z.string().optional(),
});

const ALLOWED: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'skipped'],
  sent: ['paid', 'overdue', 'skipped'],
  overdue: ['paid', 'skipped'],
  paid: [],
  skipped: [],
};

interface Ctx {
  params: { id: string };
}

export async function POST(req: Request, { params }: Ctx) {
  const guard = await requireApiRole('admin', 'dispatcher');
  if ('response' in guard) return guard.response;

  const parsed = await parseJson(req, transitionSchema);
  if (!parsed.success) return parsed.response;

  try {
    const current = await invoicesStore.requireById(params.id);
    const map: Record<typeof parsed.data.action, InvoiceStatus> = {
      send: 'sent',
      mark_paid: 'paid',
      mark_overdue: 'overdue',
      skip: 'skipped',
    };
    const to = map[parsed.data.action];
    if (!ALLOWED[current.status].includes(to)) {
      return errorResponse('CONFLICT', `Transition ${current.status} → ${to} not allowed`);
    }
    const now = nowIso();
    const next = {
      ...current,
      status: to,
      sentAt: to === 'sent' ? now : current.sentAt,
      paidAt: to === 'paid' ? now : current.paidAt,
      skippedAt: to === 'skipped' ? now : current.skippedAt,
      updatedAt: now,
    };
    await invoicesStore.upsert(next);
    const kindMap: Record<InvoiceStatus, InvoiceEvent['kind'] | null> = {
      draft: null,
      sent: 'sent',
      paid: 'paid',
      overdue: 'overdue',
      skipped: 'skipped',
    };
    const kind = kindMap[to];
    if (kind) {
      const event: InvoiceEvent = {
        id: generateId('iev'),
        invoiceId: current.id,
        kind,
        note: parsed.data.note ?? null,
        actorId: guard.session.user.id,
        createdAt: now,
      };
      await invoiceEventsStore.upsert(event);
    }
    return NextResponse.json({ invoice: next });
  } catch (err) {
    if (err instanceof MockStoreError && err.code === 'NOT_FOUND') {
      return errorResponse('NOT_FOUND', 'Invoice not found');
    }
    throw err;
  }
}
