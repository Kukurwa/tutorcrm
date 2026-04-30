'use client';

import {
  AlertTriangle,
  Banknote,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Inbox,
  ReceiptText,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Wallet,
} from 'lucide-react';
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

const STAGE_LABELS: Record<string, string> = {
  lead_created: 'Лиды',
  request_created: 'Заявка сформирована',
  published: 'Опубликовано',
  searching_tutor: 'Поиск репетитора',
  trial_scheduled: 'Пробное назначено',
  trial_done: 'Пробное проведено',
  active: 'Активные',
  closed_won: 'Успешно закрыто',
  closed_lost: 'Отказ',
};

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

  const funnelEntries = data ? Object.entries(data.funnel) : [];
  const funnelMax = funnelEntries.length ? Math.max(...funnelEntries.map(([, v]) => v), 1) : 1;

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
        <p className="text-muted-foreground text-sm">Загрузка метрик…</p>
      ) : (
        <>
          <div>
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
              Операции
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                icon={ShieldCheck}
                title="Активные контракты"
                value={data.operations.activeContracts}
              />
              <MetricTile
                icon={Inbox}
                title="Непрочитанные диалоги"
                value={data.operations.unreadDialogs}
              />
              <MetricTile icon={Sprout} title="Новые лиды" value={data.operations.newLeads} />
              <MetricTile
                icon={AlertTriangle}
                title="Просроченные задачи"
                value={data.operations.overdueTasks}
              />
            </div>
          </div>

          <div>
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
              Финансы
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                icon={Banknote}
                title="Выставлено клиентам"
                value={formatCurrency(data.finance.totalInvoicedClient)}
              />
              <MetricTile
                icon={Wallet}
                title="Оплачено клиентами"
                value={formatCurrency(data.finance.totalPaidClient)}
              />
              <MetricTile
                icon={TrendingUp}
                title="Комиссия (прогноз)"
                value={formatCurrency(Math.round(data.finance.totalCommissionProjected))}
              />
              <MetricTile
                icon={Clock}
                title="Просроченные инвойсы"
                value={data.finance.overdueInvoices}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="text-muted-foreground h-4 w-4" />
                  Воронка по стадиям
                </CardTitle>
              </CardHeader>
              <CardContent>
                {funnelEntries.length === 0 ? (
                  <p className="text-muted-foreground text-sm">В выбранном диапазоне заявок нет.</p>
                ) : (
                  <ul className="space-y-3">
                    {funnelEntries.map(([stage, count]) => (
                      <li key={stage} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{STAGE_LABELS[stage] ?? stage}</span>
                          <span className="font-semibold tabular-nums">{count}</span>
                        </div>
                        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${(count / funnelMax) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="text-muted-foreground h-4 w-4" />
                  По предметам
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.bySubject.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет данных.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-xs uppercase tracking-wide">
                        <th className="pb-2 text-left font-medium">Предмет</th>
                        <th className="pb-2 text-right font-medium">Заявок</th>
                        <th className="pb-2 text-right font-medium">Контрактов</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bySubject.map((r) => (
                        <tr key={r.subjectId} className="border-b last:border-b-0">
                          <td className="py-2">{r.name}</td>
                          <td className="py-2 text-right font-medium tabular-nums">{r.requests}</td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {r.contracts}
                          </td>
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="text-muted-foreground h-4 w-4" />
                  Топ репетиторов
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.tutors.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет активных контрактов.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.tutors.map((t, i) => (
                      <li key={t.id} className="flex items-center gap-3 text-sm">
                        <span className="bg-muted inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium tabular-nums">
                          {i + 1}
                        </span>
                        <span className="flex-1 font-medium">{t.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {t.activeContracts} контр.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="text-muted-foreground h-4 w-4" />
                  Экспорт
                </CardTitle>
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

function MetricTile({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md border">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground text-xs">{title}</div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
