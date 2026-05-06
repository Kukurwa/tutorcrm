'use client';

import { useMemo } from 'react';

import { Card, CardContent } from '@tutorcrm/ui';

import { fmtPercent } from '@/lib/format-num';
import {
  computeRetention,
  type ContractRow,
  type RequestRow,
  type SubjectRow,
  type TrialRow,
} from '@/lib/metrics/extended';
import { lastNMonths, monthLabel, type MonthKey } from '@/lib/metrics/period';

export function RetentionTab({
  contracts,
  trials,
  requests,
  subjects,
}: {
  contracts: ContractRow[];
  trials: TrialRow[];
  requests: RequestRow[];
  subjects: SubjectRow[];
}) {
  const months: MonthKey[] = useMemo(() => lastNMonths(new Date(), 4), []);

  const rows = useMemo(
    () => computeRetention({ contracts, trials, requests, subjects, months }),
    [contracts, trials, requests, subjects, months],
  );

  const grouped = useMemo(() => {
    const out = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = out.get(r.monthKey) ?? [];
      arr.push(r);
      out.set(r.monthKey, arr);
    }
    return out;
  }, [rows]);

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div>
          <h3 className="text-sm font-medium">Удержание клиентов на контрактах</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            По месяцам × предмет: пробные, успешные, %, отпавшие по возрасту начала. «Отпавший» =
            контракт со статусом «закрыт неуспешно» в этом месяце.
          </p>
        </div>

        {[...months].reverse().map((m) => {
          const key = `${m.year}-${String(m.month).padStart(2, '0')}`;
          const monthRows = grouped.get(key) ?? [];
          return (
            <div key={key}>
              <h4 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                {monthLabel(m)}
              </h4>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr className="text-muted-foreground text-left uppercase tracking-wide">
                      <th className="px-2 py-2 font-medium">Предмет</th>
                      <th className="px-2 py-2 text-right font-medium">Пробных</th>
                      <th className="px-2 py-2 text-right font-medium">Успешн.</th>
                      <th className="px-2 py-2 text-right font-medium">% усп.</th>
                      <th className="px-2 py-2 text-right font-medium">Тек. мес.</th>
                      <th className="px-2 py-2 text-right font-medium">% от усп.</th>
                      <th className="px-2 py-2 text-right font-medium">Прошл. мес.</th>
                      <th className="px-2 py-2 text-right font-medium">Позапрошл.</th>
                      <th className="px-2 py-2 text-right font-medium">3+ мес.</th>
                      <th className="px-2 py-2 text-right font-medium">ИТОГО отп.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthRows.length === 0 ? (
                      <tr>
                        <td className="text-muted-foreground py-4 text-center" colSpan={10}>
                          Нет данных за этот месяц.
                        </td>
                      </tr>
                    ) : (
                      monthRows.map((r) => (
                        <tr key={`${r.monthKey}::${r.subjectId}`} className="hover:bg-muted/20">
                          <td className="px-2 py-2 font-medium">{r.subjectName}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.trials}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.successful}</td>
                          <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
                            {fmtPercent(r.successRate, 0)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.droppedThis}</td>
                          <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
                            {fmtPercent(r.droppedThisPct, 0)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.droppedLast}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.droppedPrev}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.dropped3Plus}</td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">
                            {r.totalDropped}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
