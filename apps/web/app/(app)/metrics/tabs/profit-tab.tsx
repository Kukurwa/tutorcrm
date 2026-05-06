'use client';

import { Banknote, Coins, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent } from '@tutorcrm/ui';

import { KpiStat } from '@/components/ui/kpi-stat';
import { fmtMoney } from '@/lib/format-num';
import {
  computeProfit,
  type ContractRow,
  type DispatcherRow,
  type OneTimePaymentRow,
  type RequestRow,
} from '@/lib/metrics/extended';
import type { MonthKey } from '@/lib/metrics/period';

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
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiStat
          label="Контрактные"
          value={fmtMoney(profit.contractProfit)}
          accent="emerald"
          icon={<Banknote className="h-5 w-5" />}
        />
        <KpiStat
          label="Разовые"
          value={fmtMoney(profit.oneTimeProfit)}
          accent="sky"
          icon={<Coins className="h-5 w-5" />}
        />
        <KpiStat
          label="Итого прибыль"
          value={fmtMoney(profit.total)}
          accent="violet"
          size="lg"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 text-sm font-medium">По диспетчерам</h3>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 font-medium">Диспетчер</th>
                  <th className="px-3 py-2 text-right font-medium">Контрактные</th>
                  <th className="px-3 py-2 text-right font-medium">Разовые</th>
                  <th className="px-3 py-2 text-right font-medium">Итого</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {profit.byDispatcher.length === 0 ? (
                  <tr>
                    <td className="text-muted-foreground py-6 text-center text-sm" colSpan={4}>
                      Нет данных за выбранный месяц.
                    </td>
                  </tr>
                ) : (
                  profit.byDispatcher.map((d) => (
                    <tr key={d.dispatcherId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                        {fmtMoney(d.contractProfit)}
                      </td>
                      <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                        {fmtMoney(d.oneTimeProfit)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {fmtMoney(d.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr>
                  <td className="px-3 py-2.5 text-sm font-semibold">ИТОГО</td>
                  <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums">
                    {fmtMoney(profit.contractProfit)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums">
                    {fmtMoney(profit.oneTimeProfit)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">
                    {fmtMoney(profit.total)}
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
