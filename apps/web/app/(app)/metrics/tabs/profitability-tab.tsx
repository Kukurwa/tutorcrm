'use client';

import { useMemo, useState } from 'react';

import type { RegularPricing } from '@tutorcrm/contracts';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, toast } from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { computeProfitability, type ContractRow, type TrialRow } from '@/lib/metrics/extended';

const fmt = (n: number) => `${n.toLocaleString('ru-RU')} грн`;

export function ProfitabilityTab({
  contracts,
  trials,
  initialPricing,
  pricingBySubject,
  initialCutoffDays,
}: {
  contracts: ContractRow[];
  trials: TrialRow[];
  initialPricing: RegularPricing;
  pricingBySubject: Record<string, RegularPricing>;
  initialCutoffDays: number;
}) {
  const [cutoffDays, setCutoffDays] = useState(initialCutoffDays);
  const [pricing, setPricing] = useState(initialPricing);
  const [saving, setSaving] = useState(false);

  const data = useMemo(
    () =>
      computeProfitability({
        contracts,
        trials,
        regularPricing: pricing,
        regularPricingBySubject: pricingBySubject,
        cutoffDays,
      }),
    [contracts, trials, pricing, pricingBySubject, cutoffDays],
  );

  async function saveSettings() {
    setSaving(true);
    try {
      await api.put('/api/system-settings', {
        regularPricing: pricing,
        profitabilityCutoffDays: cutoffDays,
      });
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Параметры расчёта</CardTitle>
            <p className="text-muted-foreground text-xs">
              Cutoff отбрасывает учеников младше указанного возраста (по умолчанию 45 дней —
              статистика по новым ещё «смазана»). Прайс «обычных» условий применяется глобально,
              если для предмета не задан свой.
            </p>
          </div>
          <Button size="sm" disabled={saving} onClick={saveSettings}>
            Сохранить
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <FieldNum
              label="Cutoff, дней"
              value={cutoffDays}
              onChange={(v) => setCutoffDays(Math.max(1, Math.min(365, v)))}
            />
            <FieldNum
              label="1 раз/нед, грн"
              value={pricing.onePerWeek}
              onChange={(v) => setPricing({ ...pricing, onePerWeek: Math.max(0, v) })}
            />
            <FieldNum
              label="2 раз/нед, грн"
              value={pricing.twoPerWeek}
              onChange={(v) => setPricing({ ...pricing, twoPerWeek: Math.max(0, v) })}
            />
            <FieldNum
              label="3 раза/нед, грн"
              value={pricing.threePerWeek}
              onChange={(v) => setPricing({ ...pricing, threePerWeek: Math.max(0, v) })}
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Cutoff: {data.cutoffDate} (учитываются клиенты, начавшие до этой даты).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <SmallStat label="Учеников 45+" value={String(data.total.students)} />
        <SmallStat label="Ожидаемый доход (обычн.)" value={fmt(data.total.expectedRegularIncome)} />
        <SmallStat label="Факт доход (контракт)" value={fmt(data.total.actualContractIncome)} />
        <SmallStat
          label="Δ / Эффективность"
          value={`${fmt(data.total.delta)} / ${data.total.efficiency}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Контракт vs обычные — по репетиторам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr className="text-muted-foreground text-left uppercase">
                  <th className="py-2 pr-2 font-medium">Репетитор</th>
                  <th className="py-2 pr-2 font-medium">Предмет</th>
                  <th className="py-2 pr-2 text-right font-medium">Пробных 45+</th>
                  <th className="py-2 pr-2 text-right font-medium">Успех</th>
                  <th className="py-2 pr-2 text-right font-medium">Отказ</th>
                  <th className="py-2 pr-2 text-right font-medium">Успех %</th>
                  <th className="py-2 pr-2 text-right font-medium">Учеников</th>
                  <th className="py-2 pr-2 text-right font-medium">Удерж., дн</th>
                  <th className="py-2 pr-2 text-right font-medium">1р/2р/3р</th>
                  <th className="py-2 pr-2 text-right font-medium">Ср. цена</th>
                  <th className="py-2 pr-2 text-right font-medium">Ожид. (звич.)</th>
                  <th className="py-2 pr-2 text-right font-medium">Факт (контракт)</th>
                  <th className="py-2 pr-2 text-right font-medium">Δ</th>
                  <th className="py-2 text-right font-medium">Эфф. %</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td className="text-muted-foreground py-4 text-center" colSpan={14}>
                      Нет учеников старше cutoff. Уменьшите его или добавьте данные.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.tutorId} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{r.tutorName}</td>
                      <td className="text-muted-foreground py-2 pr-2">{r.subjectName ?? '—'}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.trials45plus}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.successful}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.refused}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.successRate}%</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.students}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.avgRetentionDays}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {r.freq1Pct}/{r.freq2Pct}/{r.freq3Pct}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {r.avgRequestPrice.toLocaleString('ru-RU')}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {fmt(r.expectedRegularIncome)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {fmt(r.actualContractIncome)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        <span className={r.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {fmt(r.delta)}
                        </span>
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {r.efficiency}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.rows.length > 0 ? (
                <tfoot>
                  <tr className="border-t-2">
                    <td className="py-2 pr-2 font-semibold" colSpan={6}>
                      ИТОГО
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">
                      {data.total.students}
                    </td>
                    <td className="py-2 pr-2" colSpan={3} />
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">
                      {fmt(data.total.expectedRegularIncome)}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">
                      {fmt(data.total.actualContractIncome)}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">
                      <span
                        className={data.total.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                      >
                        {fmt(data.total.delta)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-bold tabular-nums">
                      {data.total.efficiency}%
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      <Input
        type="number"
        className="h-8 tabular-nums"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-muted-foreground text-xs uppercase">{label}</div>
        <div className="mt-1 font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
