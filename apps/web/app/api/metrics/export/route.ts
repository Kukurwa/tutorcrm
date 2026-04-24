import { NextResponse } from 'next/server';

import { requireApiSession } from '@/lib/api/guards';
import {
  contractsStore,
  invoicesStore,
  requestsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return '';
          const s = String(cell);
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(','),
    )
    .join('\n');
}

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'contracts';

  let csv = '';
  let filename = 'export.csv';

  if (type === 'contracts') {
    const contracts = await contractsStore.list();
    const mine = guard.session.user.role === 'dispatcher'
      ? contracts.filter((c) => c.dispatcherId === guard.session.user.id)
      : contracts;
    csv = toCsv([
      ['id', 'client', 'tutor', 'subject', 'rate', 'commission', 'status', 'started'],
      ...mine.map((c) => [
        c.id,
        c.clientName,
        c.tutorName,
        c.subjectName ?? '',
        String(c.hourlyRate),
        String(c.commissionRate),
        c.status,
        c.startedAt,
      ]),
    ]);
    filename = 'contracts.csv';
  } else if (type === 'requests') {
    const requests = await requestsStore.list();
    const mine =
      guard.session.user.role === 'dispatcher'
        ? requests.filter((r) => r.dispatcherId === guard.session.user.id)
        : requests;
    csv = toCsv([
      ['id', 'client', 'subject', 'deal_type', 'stage', 'budget_from', 'budget_to', 'created'],
      ...mine.map((r) => [
        r.id,
        r.clientName,
        r.subjectName ?? '',
        r.dealType,
        r.stage,
        String(r.budgetFrom ?? ''),
        String(r.budgetTo ?? ''),
        r.createdAt,
      ]),
    ]);
    filename = 'requests.csv';
  } else if (type === 'invoices') {
    const rows = await invoicesStore.list();
    csv = toCsv([
      ['id', 'contract', 'recipient', 'amount', 'currency', 'status', 'period_start', 'period_end', 'due'],
      ...rows.map((i) => [
        i.id,
        i.contractId,
        i.recipient,
        String(i.amount),
        i.currency,
        i.status,
        i.periodStart,
        i.periodEnd,
        i.dueDate,
      ]),
    ]);
    filename = 'invoices.csv';
  } else {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Unknown type' } }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
