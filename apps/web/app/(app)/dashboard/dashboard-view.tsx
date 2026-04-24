'use client';

import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  type StatusTone,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';

interface Metrics {
  funnel: Record<string, number>;
  finance: {
    totalInvoicedClient: number;
    totalPaidClient: number;
    totalCommissionProjected: number;
    overdueInvoices: number;
  };
  operations: {
    unreadDialogs: number;
    newLeads: number;
    overdueTasks: number;
    activeContracts: number;
  };
  bySubject: { subjectId: string; name: string; requests: number; contracts: number }[];
  tutors: { id: string; name: string; activeContracts: number }[];
}

interface Props {
  subjects: { id: string; name: string }[];
  dispatchers: { id: string; name: string }[];
  showDispatcherFilter: boolean;
}

export function DashboardView({ subjects, dispatchers, showDispatcherFilter }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dispatcherId, setDispatcherId] = useState('');
  const [data, setData] = useState<Metrics | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        if (subjectId) qs.set('subjectId', subjectId);
        if (dispatcherId) qs.set('dispatcherId', dispatcherId);
        const res = await api.get<Metrics>(`/api/metrics?${qs.toString()}`);
        setData(res);
      } catch (err) {
        if (err instanceof ApiClientError) {
          // quietly
        }
      }
    })();
  }, [from, to, subjectId, dispatcherId]);

  function downloadCsv(type: 'contracts' | 'requests' | 'invoices') {
    window.location.href = `/api/metrics/export?type=${type}`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <FormField label="С">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FormField>
          <FormField label="До">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FormField>
          <FormField label="Предмет">
            <Select
              value={subjectId === '' ? '__all' : subjectId}
              onValueChange={(v) => setSubjectId(v === '__all' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Все</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {showDispatcherFilter ? (
            <FormField label="Диспетчер">
              <Select
                value={dispatcherId === '' ? '__all' : dispatcherId}
                onValueChange={(v) => setDispatcherId(v === '__all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Все</SelectItem>
                  {dispatchers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      {!data ? (
        <p className="text-sm text-muted-foreground">Загрузка метрик…</p>
      ) : (
        <>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Операции
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric title="Активные контракты" value={data.operations.activeContracts} tone="success" />
            <Metric title="Непрочитанные диалоги" value={data.operations.unreadDialogs} tone="warning" />
            <Metric title="Новые лиды" value={data.operations.newLeads} tone="info" />
            <Metric title="Просроченные задачи" value={data.operations.overdueTasks} tone="danger" />
          </div>

          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Финансы
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              title="Выставлено клиентам"
              value={formatCurrency(data.finance.totalInvoicedClient)}
              tone="neutral"
            />
            <Metric
              title="Оплачено клиентами"
              value={formatCurrency(data.finance.totalPaidClient)}
              tone="success"
            />
            <Metric
              title="Комиссия (прогноз)"
              value={formatCurrency(Math.round(data.finance.totalCommissionProjected))}
              tone="info"
            />
            <Metric
              title="Просроченные инвойсы"
              value={data.finance.overdueInvoices}
              tone="danger"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Воронка</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.funnel).length === 0 ? (
                  <p className="text-sm text-muted-foreground">В выбранном диапазоне заявок нет.</p>
                ) : (
                  <ul className="space-y-2">
                    {Object.entries(data.funnel).map(([stage, count]) => (
                      <li key={stage} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs">{stage}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">По предметам</CardTitle>
              </CardHeader>
              <CardContent>
                {data.bySubject.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет данных.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Предмет</th>
                        <th className="pb-2 text-right font-medium">Заявок</th>
                        <th className="pb-2 text-right font-medium">Контрактов</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bySubject.map((r) => (
                        <tr key={r.subjectId} className="border-b last:border-b-0">
                          <td className="py-1">{r.name}</td>
                          <td className="py-1 text-right font-mono">{r.requests}</td>
                          <td className="py-1 text-right font-mono">{r.contracts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Топ репетиторов</CardTitle>
              </CardHeader>
              <CardContent>
                {data.tutors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет активных контрактов.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.tutors.map((t) => (
                      <li key={t.id} className="flex items-center justify-between">
                        <span>{t.name}</span>
                        <span className="font-mono">{t.activeContracts}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Экспорт</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadCsv('contracts')}>
                  <Download className="h-4 w-4" /> Контракты
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadCsv('requests')}>
                  <Download className="h-4 w-4" /> Заявки
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadCsv('invoices')}>
                  <Download className="h-4 w-4" /> Инвойсы
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number | string;
  tone: StatusTone;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <StatusBadge tone={tone} label="" className="px-1" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
