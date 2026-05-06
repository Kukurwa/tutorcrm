'use client';

import { useMemo } from 'react';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tutorcrm/ui';

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
        <CardHeader>
          <CardTitle className="text-base">Активность диспетчеров за месяц</CardTitle>
          <p className="text-muted-foreground text-xs">
            Лидов / заявок, успешность, причины отказов, SLA. SLA посчитан приблизительно по времени
            жизни диалога / заявки — реальные «first response» / «tutor found» отметки появятся на
            бэке.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="py-2 pr-3 font-medium">Диспетчер</th>
                  <th className="py-2 pr-3 text-right font-medium">Лиды</th>
                  <th className="py-2 pr-3 text-right font-medium">Заявки</th>
                  <th className="py-2 pr-3 text-right font-medium">Успех</th>
                  <th className="py-2 pr-3 text-right font-medium">Отказ</th>
                  <th className="py-2 pr-3 text-right font-medium">% успеха</th>
                  <th className="py-2 pr-3 text-right font-medium">SLA первого ответа, мин</th>
                  <th className="py-2 text-right font-medium">SLA поиска репа, ч</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.dispatcherId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.totalLeads}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.totalRequests}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.totalSuccess}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.totalRefusals}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                      {r.successRate}%
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.avgFirstResponseMin || '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.avgTutorSearchHours || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.dispatcherId}>
            <CardHeader>
              <CardTitle className="text-base">{r.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase">Лиды по этапам</div>
                {Object.keys(r.byStage).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет заявок в этом месяце.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(r.byStage).map(([stage, count]) => (
                      <Badge key={stage} variant="secondary" className="text-[11px]">
                        {STAGE_LABELS[stage] ?? stage}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs uppercase">Причины отказов</div>
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
