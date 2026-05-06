'use client';

import { useMemo } from 'react';

import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@tutorcrm/ui';

import { fmtMoney } from '@/lib/format-num';
import {
  computeContractMetrics,
  type ContractMetricRow,
  type ContractRow,
  type DispatcherRow,
  type SubjectRow,
} from '@/lib/metrics/extended';
import { lastNMonths, monthLabel, type MonthKey } from '@/lib/metrics/period';

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
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Прибыль контрактных за 6 месяцев</h3>
            <span className="text-muted-foreground text-xs">
              ВСЕГО:{' '}
              <span className="text-foreground font-semibold tabular-nums">
                {fmtMoney(data.grandTotal)}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {monthKeys.map((k, i) => (
              <div key={k} className="bg-muted/30 rounded-md p-3 text-sm">
                <div className="text-muted-foreground text-xs">{monthLabels[i]}</div>
                <div className="mt-1 font-semibold tabular-nums">
                  {fmtMoney(data.monthTotals[k] ?? 0)}
                </div>
              </div>
            ))}
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
          <BreakdownTable rows={data.bySubject} monthKeys={monthKeys} monthLabels={monthLabels} />
        </TabsContent>
        <TabsContent value="byDispatcher">
          <BreakdownTable
            rows={data.byDispatcher}
            monthKeys={monthKeys}
            monthLabels={monthLabels}
          />
        </TabsContent>
        <TabsContent value="byTutor">
          <BreakdownTable rows={data.byTutor} monthKeys={monthKeys} monthLabels={monthLabels} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BreakdownTable({
  rows,
  monthKeys,
  monthLabels,
}: {
  rows: ContractMetricRow[];
  monthKeys: string[];
  monthLabels: string[];
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40">
              <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">Имя</th>
                {monthLabels.map((l) => (
                  <th key={l} className="px-3 py-2 text-right font-medium">
                    {l}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="text-muted-foreground py-6 text-center text-sm"
                    colSpan={monthLabels.length + 2}
                  >
                    Нет данных за период.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    {monthKeys.map((k) => (
                      <td
                        key={k}
                        className="text-muted-foreground px-3 py-2 text-right tabular-nums"
                      >
                        {fmtMoney(r.byMonth[k] ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {fmtMoney(r.total)}
                    </td>
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
