'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@tutorcrm/ui';

import {
  computeProfit,
  type ContractRow,
  type DispatcherRow,
  type OneTimePaymentRow,
  type RequestRow,
} from '@/lib/metrics/extended';
import type { MonthKey } from '@/lib/metrics/period';

const fmt = (n: number) => `${n.toLocaleString('ru-RU')} грн`;

export function ProfitTab({
  dispatchers,
  contracts,
  oneTimePayments,
  requests,
  month,
}: {
  dispatchers: DispatcherRow[];
  contracts: ContractRow[];
  oneTimePayments: OneTimePaymentRow[];
  requests: RequestRow[];
  month: MonthKey;
}) {
  const profit = useMemo(
    () => computeProfit({ dispatchers, contracts, oneTimePayments, requests, month }),
    [dispatchers, contracts, oneTimePayments, requests, month],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Контрактные" value={fmt(profit.contractProfit)} accent="emerald" />
        <SummaryCard title="Разовые" value={fmt(profit.oneTimeProfit)} accent="sky" />
        <SummaryCard title="ИТОГО" value={fmt(profit.total)} accent="violet" highlight />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">По диспетчерам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="py-2 pr-3 font-medium">Диспетчер</th>
                  <th className="py-2 pr-3 text-right font-medium">Контрактные</th>
                  <th className="py-2 pr-3 text-right font-medium">Разовые</th>
                  <th className="py-2 text-right font-medium">Итого</th>
                </tr>
              </thead>
              <tbody>
                {profit.byDispatcher.map((d) => (
                  <tr key={d.dispatcherId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{d.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(d.contractProfit)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(d.oneTimeProfit)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{fmt(d.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td className="py-2 pr-3 font-semibold">ИТОГО</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                    {fmt(profit.contractProfit)}
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                    {fmt(profit.oneTimeProfit)}
                  </td>
                  <td className="py-2 text-right text-base font-bold tabular-nums">
                    {fmt(profit.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  accent,
  highlight,
}: {
  title: string;
  value: string;
  accent: 'emerald' | 'sky' | 'violet';
  highlight?: boolean;
}) {
  const ring = {
    emerald: 'border-emerald-200',
    sky: 'border-sky-200',
    violet: 'border-violet-200',
  }[accent];
  return (
    <Card className={ring}>
      <CardContent className="py-5">
        <div className="text-muted-foreground text-xs uppercase tracking-wide">{title}</div>
        <div className={highlight ? 'mt-1 text-2xl font-bold' : 'mt-1 text-xl font-semibold'}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
