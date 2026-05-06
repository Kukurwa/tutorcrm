'use client';

import { useMemo } from 'react';

import { Badge, Card, CardContent } from '@tutorcrm/ui';

import { fmtPercent } from '@/lib/format-num';
import {
  computeDispatcherStats,
  type DialogRow,
  type DispatcherRow,
  type LeadRow,
  type RejectionReasonRow,
  type RequestRow,
} from '@/lib/metrics/extended';
import type { MonthKey } from '@/lib/metrics/period';

const STAGE_LABELS: Record<string, string> = {
  lead_created: 'Лид',
  request_created: 'Заявка',
  published: 'Опубликована',
  searching_tutor: 'Поиск репа',
  tutor_found: 'Найден реп',
  trial_scheduled: 'Пробный назначен',
  trial_done: 'Пробный',
  active: 'Активна',
  closed_won: 'Успех',
  closed_lost: 'Отказ',
};

export function DispatchersTab({
  dispatchers,
  leads,
  requests,
  dialogs,
  rejectionReasons,
  month,
}: {
  dispatchers: DispatcherRow[];
  leads: LeadRow[];
  requests: RequestRow[];
  dialogs: DialogRow[];
  rejectionReasons: RejectionReasonRow[];
  month: MonthKey;
}) {
  const { fromIso, toIso } = useMemo(() => {
    const from = new Date(month.year, month.month - 1, 1).toISOString();
    const to = new Date(month.year, month.month, 0, 23, 59, 59).toISOString();
    return { fromIso: from, toIso: to };
  }, [month]);

  const rows = useMemo(
    () =>
      computeDispatcherStats({
        dispatchers,
        leads,
        requests,
        dialogs,
        rejectionReasons,
        fromIso,
        toIso,
      }),
    [dispatchers, leads, requests, dialogs, rejectionReasons, fromIso, toIso],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-3">
            <h3 className="text-sm font-medium">Активность диспетчеров за месяц</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              SLA посчитан приблизительно по времени жизни диалога / заявки. Реальные «first
              response» / «tutor found» отметки появятся на бэке.
            </p>
          </div>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 font-medium">Диспетчер</th>
                  <th className="px-3 py-2 text-right font-medium">Лиды</th>
                  <th className="px-3 py-2 text-right font-medium">Заявки</th>
                  <th className="px-3 py-2 text-right font-medium">Успех</th>
                  <th className="px-3 py-2 text-right font-medium">Отказ</th>
                  <th className="px-3 py-2 text-right font-medium">% успеха</th>
                  <th className="px-3 py-2 text-right font-medium">SLA ответа, мин</th>
                  <th className="px-3 py-2 text-right font-medium">SLA поиска, ч</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.dispatcherId} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.totalLeads}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.totalRequests}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.totalSuccess}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.totalRefusals}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {fmtPercent(r.successRate, 0)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                      {r.avgFirstResponseMin || '—'}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                      {r.avgTutorSearchHours || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.dispatcherId}>
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-base font-semibold">{r.name}</h3>
              <div>
                <div className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                  Заявки по этапам
                </div>
                {Object.keys(r.byStage).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет заявок в этом месяце.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(r.byStage).map(([stage, count]) => (
                      <Badge key={stage} variant="secondary" className="text-[11px] font-normal">
                        {STAGE_LABELS[stage] ?? stage}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                  Причины отказов
                </div>
                {r.rejections.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет отказов.</p>
                ) : (
                  <ul className="space-y-1">
                    {r.rejections.map((rj) => (
                      <li key={rj.reasonId} className="flex items-center justify-between text-sm">
                        <span>{rj.label}</span>
                        <span className="font-semibold tabular-nums">{rj.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
