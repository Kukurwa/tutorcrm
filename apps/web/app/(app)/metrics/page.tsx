import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  contractsStore,
  dialogsStore,
  funnelStagesStore,
  getSystemSettings,
  leadsStore,
  oneTimePaymentsStore,
  rejectionReasonsStore,
  requestsStore,
  subjectsStore,
  trialsStore,
  usersStore,
} from '@/mocks/store';

import { MetricsView } from './metrics-view';

export const metadata = { title: 'Метрики — TutorCRM' };

export default async function MetricsPage() {
  await requireRole('admin');

  const [users, contracts, requests, oneTimePayments, trials, subjects, reasons, dialogs, leads] =
    await Promise.all([
      usersStore.list(),
      contractsStore.list(),
      requestsStore.list(),
      oneTimePaymentsStore.list(),
      trialsStore.list(),
      subjectsStore.list(),
      rejectionReasonsStore.list(),
      dialogsStore.list(),
      leadsStore.list(),
    ]);

  // funnel stages нужны были бы, но extended.ts работает по голому stage-enum — не нужны
  void funnelStagesStore;

  const settings = getSystemSettings();
  const dispatchers = users
    .filter((u) => u.role === 'dispatcher' && u.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Метрики"
        description="Прибыль, план/факт, рентабельность, удержание, статистика диспетчеров. Данные считаются из контрактов, заявок и пробных за выбранный период."
      />
      <MetricsView
        dispatchers={dispatchers}
        contracts={contracts.map((c) => ({
          id: c.id,
          dispatcherId: c.dispatcherId,
          tutorId: c.tutorId,
          tutorName: c.tutorName,
          subjectId: c.subjectId,
          subjectName: c.subjectName,
          amountReceived: c.amountReceived,
          commissionRate: c.commissionRate,
          paidAt: c.paidAt,
          trialAt: c.trialAt,
          startedAt: c.startedAt,
          closedAt: c.closedAt,
          closeReason: c.closeReason,
          status: c.status,
          lessonsPerWeek: c.lessonsPerWeek,
          requestPrice: c.requestPrice,
        }))}
        oneTimePayments={oneTimePayments.map((p) => ({
          requestId: p.requestId,
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt,
        }))}
        requests={requests.map((r) => ({
          id: r.id,
          dispatcherId: r.dispatcherId,
          subjectId: r.subjectId,
          subjectName: r.subjectName,
          stage: r.stage,
          requestPrice: r.requestPrice,
          rejectionReasonId: r.rejectionReasonId,
          assignedTutorId: r.assignedTutorId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }))}
        trials={trials.map((t) => ({
          id: t.id,
          requestId: t.requestId,
          tutorId: t.tutorId,
          scheduledAt: t.scheduledAt,
          result: t.result,
        }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        rejectionReasons={reasons.map((r) => ({ id: r.id, label: r.label }))}
        dialogs={dialogs.map((d) => ({
          id: d.id,
          dispatcherId: d.dispatcherId,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }))}
        leads={leads.map((l) => ({
          id: l.id,
          dispatcherId: l.dispatcherId,
          createdAt: l.createdAt,
        }))}
        regularPricing={settings.regularPricing}
        regularPricingBySubject={settings.regularPricingBySubject}
        cutoffDays={settings.profitabilityCutoffDays}
      />
    </div>
  );
}
