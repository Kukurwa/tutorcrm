'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@tutorcrm/ui';

import {
  computePlanFact,
  type DispatcherRow,
  type RejectionReasonRow,
  type RequestRow,
  type SubjectRow,
} from '@/lib/metrics/extended';
import type { MonthKey } from '@/lib/metrics/period';

const fmt = (n: number) => `${n.toLocaleString('ru-RU')} грн`;

export function PlanFactTab({
  dispatchers,
  requests,
  subjects,
  rejectionReasons,
  month,
}: {
  dispatchers: DispatcherRow[];
  requests: RequestRow[];
  subjects: SubjectRow[];
  rejectionReasons: RejectionReasonRow[];
  month: MonthKey;
}) {
  const data = useMemo(
    () => computePlanFact({ dispatchers, subjects, requests, rejectionReasons, month }),
    [dispatchers, subjects, requests, rejectionReasons, month],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <div className="text-muted-foreground text-xs uppercase">План (Н)</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{fmt(data.total.plan)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <div className="text-muted-foreground text-xs uppercase">Факт (М)</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{fmt(data.total.fact)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <div className="text-muted-foreground text-xs uppercase">Успешность</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{data.total.successRate}%</div>
            <div className="text-muted-foreground text-xs">
              Δ = {fmt(data.total.fact - data.total.plan)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Предмет × Диспетчер</CardTitle>
          <p className="text-muted-foreground text-xs">
            Учитываются только заявки с конечным результатом (успех или отказ) в выбранном месяце.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="py-2 pr-3 font-medium">Предмет</th>
                  <th className="py-2 pr-3 font-medium">Диспетчер</th>
                  <th className="py-2 pr-3 text-right font-medium">План (Н)</th>
                  <th className="py-2 pr-3 text-right font-medium">Факт (М)</th>
                  <th className="py-2 pr-3 text-right font-medium">Δ</th>
                  <th className="py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td className="text-muted-foreground py-4 text-center" colSpan={6}>
                      Нет заявок с конечным результатом в этом месяце.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={`${r.subjectId}::${r.dispatcherId}`}
                      className="border-b last:border-0"
                    >
                      <td className="py-2 pr-3 font-medium">{r.subjectName}</td>
                      <td className="py-2 pr-3">{r.dispatcherName}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.plan)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.fact)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.diff)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {r.successRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По диспетчерам</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="py-2 pr-3 font-medium">Диспетчер</th>
                  <th className="py-2 pr-3 text-right font-medium">План</th>
                  <th className="py-2 pr-3 text-right font-medium">Факт</th>
                  <th className="py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {data.byDispatcher.map((d) => (
                  <tr key={d.dispatcherId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{d.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(d.plan)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(d.fact)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{d.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По предметам</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="py-2 pr-3 font-medium">Предмет</th>
                  <th className="py-2 pr-3 text-right font-medium">План</th>
                  <th className="py-2 pr-3 text-right font-medium">Факт</th>
                  <th className="py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {data.bySubject.map((s) => (
                  <tr key={s.subjectId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{s.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(s.plan)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(s.fact)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{s.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Причины отказа</CardTitle>
        </CardHeader>
        <CardContent>
          {data.rejections.length === 0 ? (
            <p className="text-muted-foreground text-sm">Нет отказов в этом месяце.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="py-2 pr-3 font-medium">Причина</th>
                  <th className="py-2 pr-3 text-right font-medium">Кол-во</th>
                  <th className="py-2 text-right font-medium">Сумма потерянного</th>
                </tr>
              </thead>
              <tbody>
                {data.rejections.map((r) => (
                  <tr key={r.reasonId} className="border-b last:border-0">
                    <td className="py-2 pr-3">{r.reasonLabel}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(r.lostSum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
