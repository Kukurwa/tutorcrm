'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@tutorcrm/ui';

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
  const monthByKey = new Map(
    months.map((m) => [`${m.year}-${String(m.month).padStart(2, '0')}`, m]),
  );

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Удержание клиентов на контрактах</CardTitle>
          <p className="text-muted-foreground text-xs">
            По месяцам × предмет: пробных, успешных, % успешных, отпавших по возрасту начала (этого
            / прошлого / позапрошлого / 3+ мес. назад). Отпавший = контракт со статусом «закрыт
            неуспешно» в этом месяце.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...monthByKey.entries()].reverse().map(([key, m]) => {
            const monthRows = grouped.get(key) ?? [];
            return (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold">{monthLabel(m)}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b">
                      <tr className="text-muted-foreground text-left uppercase">
                        <th className="py-2 pr-2 font-medium">Предмет</th>
                        <th className="py-2 pr-2 text-right font-medium">Пробных</th>
                        <th className="py-2 pr-2 text-right font-medium">Успешн.</th>
                        <th className="py-2 pr-2 text-right font-medium">% успешн.</th>
                        <th className="py-2 pr-2 text-right font-medium">Отпало (тек. мес.)</th>
                        <th className="py-2 pr-2 text-right font-medium">% от успешн.</th>
                        <th className="py-2 pr-2 text-right font-medium">Прошл. мес.</th>
                        <th className="py-2 pr-2 text-right font-medium">Позапрошл.</th>
                        <th className="py-2 pr-2 text-right font-medium">3+ мес.</th>
                        <th className="py-2 text-right font-medium">ИТОГО отпало</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.length === 0 ? (
                        <tr>
                          <td className="text-muted-foreground py-3 text-center" colSpan={10}>
                            Нет данных за этот месяц.
                          </td>
                        </tr>
                      ) : (
                        monthRows.map((r) => (
                          <tr
                            key={`${r.monthKey}::${r.subjectId}`}
                            className="border-b last:border-0"
                          >
                            <td className="py-2 pr-2 font-medium">{r.subjectName}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{r.trials}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{r.successful}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{r.successRate}%</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{r.droppedThis}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">
                              {r.droppedThisPct}%
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">{r.droppedLast}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{r.droppedPrev}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{r.dropped3Plus}</td>
                            <td className="py-2 text-right font-semibold tabular-nums">
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
    </div>
  );
}
