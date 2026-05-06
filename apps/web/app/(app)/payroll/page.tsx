import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import {
  contractsStore,
  getPayrollConfig,
  oneTimePaymentsStore,
  requestsStore,
  usersStore,
} from '@/mocks/store';

import { PayrollView } from './payroll-view';

export const metadata = { title: 'Зарплаты — TutorCRM' };

export default async function PayrollPage() {
  await requireRole('admin');

  const [users, contracts, requests, oneTimePayments] = await Promise.all([
    usersStore.list(),
    contractsStore.list(),
    requestsStore.list(),
    oneTimePaymentsStore.list(),
  ]);

  const dispatchers = users
    .filter((u) => u.role === 'dispatcher' && u.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({ id: u.id, name: u.name, hireDate: u.hireDate }));

  const config = getPayrollConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Зарплаты"
        description="Шкалы РОПа и диспетчеров. Цифры редактируются. Расчёт за месяц по фактическим оплатам и контракт-комиссиям."
      />
      <PayrollView
        initialConfig={config}
        dispatchers={dispatchers}
        contracts={contracts.map((c) => ({
          dispatcherId: c.dispatcherId,
          amountReceived: c.amountReceived,
          commissionRate: c.commissionRate,
          paidAt: c.paidAt,
        }))}
        oneTimePayments={oneTimePayments.map((p) => ({
          requestId: p.requestId,
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt,
        }))}
        requests={requests.map((r) => ({ id: r.id, dispatcherId: r.dispatcherId }))}
      />
    </div>
  );
}
