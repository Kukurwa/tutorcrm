import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiSession } from '@/lib/api/guards';
import { parseSearchParams } from '@/lib/api/response';
import {
  contractsStore,
  dialogsStore,
  invoicesStore,
  leadsStore,
  requestsStore,
  subjectsStore,
  tasksStore,
  tutorsStore,
} from '@/mocks/store';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  subjectId: z.string().optional(),
  dispatcherId: z.string().optional(),
});

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if ('response' in guard) return guard.response;

  const parsed = parseSearchParams(new URL(req.url), querySchema);
  if (!parsed.success) return parsed.response;
  const { from, to, subjectId, dispatcherId } = parsed.data;

  const [requests, contracts, invoices, dialogs, leads, tasks, tutors, subjects] = await Promise.all([
    requestsStore.list(),
    contractsStore.list(),
    invoicesStore.list(),
    dialogsStore.list(),
    leadsStore.list(),
    tasksStore.list(),
    tutorsStore.list(),
    subjectsStore.list(),
  ]);

  const dFrom = from ? new Date(from).getTime() : 0;
  const dTo = to ? new Date(to).getTime() + 86400_000 : Date.now() + 86400_000;
  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= dFrom && t < dTo;
  };

  let reqs = requests.filter((r) => inRange(r.createdAt));
  if (subjectId) reqs = reqs.filter((r) => r.subjectId === subjectId);
  if (guard.session.user.role === 'dispatcher') {
    reqs = reqs.filter((r) => r.dispatcherId === guard.session.user.id);
  } else if (dispatcherId) {
    reqs = reqs.filter((r) => r.dispatcherId === dispatcherId);
  }

  let cons = contracts.filter((c) => inRange(c.createdAt));
  if (guard.session.user.role === 'dispatcher') {
    cons = cons.filter((c) => c.dispatcherId === guard.session.user.id);
  } else if (dispatcherId) {
    cons = cons.filter((c) => c.dispatcherId === dispatcherId);
  }

  const funnel = reqs.reduce<Record<string, number>>((acc, r) => {
    acc[r.stage] = (acc[r.stage] ?? 0) + 1;
    return acc;
  }, {});

  const finance = {
    totalInvoicedClient: invoices
      .filter((i) => i.recipient === 'client' && (i.status === 'paid' || i.status === 'sent'))
      .reduce((acc, i) => acc + i.amount, 0),
    totalPaidClient: invoices
      .filter((i) => i.recipient === 'client' && i.status === 'paid')
      .reduce((acc, i) => acc + i.amount, 0),
    totalCommissionProjected: cons
      .filter((c) => c.status === 'active')
      .reduce((acc, c) => acc + c.hourlyRate * c.commissionRate, 0),
    overdueInvoices: invoices.filter((i) => i.status === 'overdue').length,
  };

  const operations = {
    unreadDialogs: dialogs.filter((d) => d.unread > 0).length,
    newLeads: leads.filter((l) => l.status === 'new').length,
    overdueTasks: tasks.filter(
      (t) => t.status === 'open' && new Date(t.dueAt) < new Date(),
    ).length,
    activeContracts: cons.filter((c) => c.status === 'active').length,
  };

  const bySubject = subjects
    .map((s) => ({
      subjectId: s.id,
      name: s.name,
      requests: reqs.filter((r) => r.subjectId === s.id).length,
      contracts: cons.filter((c) => c.subjectId === s.id).length,
    }))
    .filter((x) => x.requests > 0 || x.contracts > 0);

  const tutorsMetric = tutors
    .map((t) => ({
      id: t.id,
      name: t.name,
      activeContracts: cons.filter((c) => c.tutorId === t.id && c.status === 'active').length,
    }))
    .filter((x) => x.activeContracts > 0);

  return NextResponse.json({
    funnel,
    finance,
    operations,
    bySubject,
    tutors: tutorsMetric,
    range: { from: from ?? null, to: to ?? null },
  });
}
