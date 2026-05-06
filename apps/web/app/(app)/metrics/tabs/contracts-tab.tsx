'use client';

import { useMemo } from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@tutorcrm/ui';

import {
  computeContractMetrics,
  type ContractMetricRow,
  type ContractRow,
  type DispatcherRow,
  type SubjectRow,
} from '@/lib/metrics/extended';
import { lastNMonths, monthLabel, type MonthKey } from '@/lib/metrics/period';

const fmt = (n: number) => `${n.toLocaleString('ru-RU')} грн`;

export function ContractsTab({
  contracts,
  dispatchers,
  subjects,
}: {
  contracts: ContractRow[];
  dispatchers: DispatcherRow[];
  subjects: SubjectRow[];
}) {
  const months: MonthKey[] = useMemo(() => lastNMonths(new Date(), 6), []);
  const monthKeys = months.map((m) => `${m.year}-${String(m.month).padStart(2, '0')}`);
  const monthLabels = months.map((m) => monthLabel(m));

  const data = useMemo(
    () => computeContractMetrics({ contracts, dispatchers, subjects, months }),
    [contracts, dispatchers, subjects, months],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Прибыль контрактных за последние 6 месяцев</CardTitle>
          <p className="text-muted-foreground text-xs">
            Прибыль = сумма комиссий по контрактам, оплаченным в месяце.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {monthKeys.map((k, i) => (
              <div key={k} className="rounded-md border p-3 text-sm">
                <div className="text-muted-foreground text-xs">{monthLabels[i]}</div>
                <div className="mt-1 font-semibold tabular-nums">
                  {fmt(data.monthTotals[k] ?? 0)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right text-sm">
            <span className="text-muted-foreground">ВСЕГО за период: </span>
            <span className="font-bold tabular-nums">{fmt(data.grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="bySubject">
        <TabsList>
          <TabsTrigger value="bySubject">По предметам</TabsTrigger>
          <TabsTrigger value="byDispatcher">По диспетчерам</TabsTrigger>
          <TabsTrigger value="byTutor">По репетиторам</TabsTrigger>
        </TabsList>
        <TabsContent value="bySubject">
          <BreakdownTable
            title="Прибыль по предметам"
            rows={data.bySubject}
            monthKeys={monthKeys}
            monthLabels={monthLabels}
          />
        </TabsContent>
        <TabsContent value="byDispatcher">
          <BreakdownTable
            title="Прибыль по диспетчерам"
            rows={data.byDispatcher}
            monthKeys={monthKeys}
            monthLabels={monthLabels}
          />
        </TabsContent>
        <TabsContent value="byTutor">
          <BreakdownTable
            title="Прибыль по репетиторам"
            rows={data.byTutor}
            monthKeys={monthKeys}
            monthLabels={monthLabels}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  monthKeys,
  monthLabels,
}: {
  title: string;
  rows: ContractMetricRow[];
  monthKeys: string[];
  monthLabels: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="py-2 pr-3 font-medium">Имя</th>
                {monthLabels.map((l) => (
                  <th key={l} className="py-2 pr-3 text-right font-medium">
                    {l}
                  </th>
                ))}
                <th className="py-2 text-right font-medium">Итого</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="text-muted-foreground py-4 text-center"
                    colSpan={monthLabels.length + 2}
                  >
                    Нет данных за период.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    {monthKeys.map((k) => (
                      <td key={k} className="py-2 pr-3 text-right tabular-nums">
                        {fmt(r.byMonth[k] ?? 0)}
                      </td>
                    ))}
                    <td className="py-2 text-right font-semibold tabular-nums">{fmt(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
