'use client';

import { useMemo } from 'react';

import { Card, CardContent } from '@tutorcrm/ui';

import { KpiStat } from '@/components/ui/kpi-stat';
import { fmtDelta, fmtMoney, fmtPercent } from '@/lib/format-num';
import {
  computePlanFact,
  type DispatcherRow,
  type RejectionReasonRow,
  type RequestRow,
  type SubjectRow,
} from '@/lib/metrics/extended';
import type { MonthKey } from '@/lib/metrics/period';

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

  const successAccent =
    data.total.successRate >= 80 ? 'emerald' : data.total.successRate >= 50 ? 'amber' : 'rose';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <KpiStat label="План (Н)" value={fmtMoney(data.total.plan)} accent="sky" />
        <KpiStat label="Факт (М)" value={fmtMoney(data.total.fact)} accent="emerald" />
        <KpiStat
          label="Успешность"
          value={fmtPercent(data.total.successRate, 0)}
          accent={successAccent}
          size="lg"
          hint={`Δ = ${fmtDelta(data.total.fact - data.total.plan)}`}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Предмет × диспетчер</h3>
            <span className="text-muted-foreground text-xs">
              Только заявки с конечным результатом
            </span>
          </div>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 font-medium">Предмет</th>
                  <th className="px-3 py-2 font-medium">Диспетчер</th>
                  <th className="px-3 py-2 text-right font-medium">План (Н)</th>
                  <th className="px-3 py-2 text-right font-medium">Факт (М)</th>
                  <th className="px-3 py-2 text-right font-medium">Δ</th>
                  <th className="px-3 py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.length === 0 ? (
                  <tr>
                    <td className="text-muted-foreground py-6 text-center text-sm" colSpan={6}>
                      Нет заявок с конечным результатом в этом месяце.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={`${r.subjectId}::${r.dispatcherId}`} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{r.subjectName}</td>
                      <td className="text-muted-foreground px-3 py-2">{r.dispatcherName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.plan)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.fact)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={r.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {fmtDelta(r.diff)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {fmtPercent(r.successRate, 0)}
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
          <CardContent className="pt-6">
            <h3 className="mb-3 text-sm font-medium">По диспетчерам</h3>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                    <th className="px-3 py-2 font-medium">Диспетчер</th>
                    <th className="px-3 py-2 text-right font-medium">План</th>
                    <th className="px-3 py-2 text-right font-medium">Факт</th>
                    <th className="px-3 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.byDispatcher.map((d) => (
                    <tr key={d.dispatcherId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                        {fmtMoney(d.plan)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(d.fact)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {fmtPercent(d.successRate, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 text-sm font-medium">По предметам</h3>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                    <th className="px-3 py-2 font-medium">Предмет</th>
                    <th className="px-3 py-2 text-right font-medium">План</th>
                    <th className="px-3 py-2 text-right font-medium">Факт</th>
                    <th className="px-3 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.bySubject.map((s) => (
                    <tr key={s.subjectId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                        {fmtMoney(s.plan)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(s.fact)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {fmtPercent(s.successRate, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 text-sm font-medium">Причины отказа</h3>
          {data.rejections.length === 0 ? (
            <p className="text-muted-foreground text-sm">Нет отказов в этом месяце.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                    <th className="px-3 py-2 font-medium">Причина</th>
                    <th className="px-3 py-2 text-right font-medium">Кол-во</th>
                    <th className="px-3 py-2 text-right font-medium">Сумма потерянного</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.rejections.map((r) => (
                    <tr key={r.reasonId} className="hover:bg-muted/20">
                      <td className="px-3 py-2">{r.reasonLabel}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.lostSum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
