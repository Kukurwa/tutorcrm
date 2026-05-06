'use client';

import { Save, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { RegularPricing } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  toast,
} from '@tutorcrm/ui';

import { KpiStat } from '@/components/ui/kpi-stat';
import { NumInput } from '@/components/ui/num-input';
import { api, ApiClientError } from '@/lib/api-client';
import { fmtDelta, fmtInt, fmtMoney, fmtPercent } from '@/lib/format-num';
import { computeProfitability, type ContractRow, type TrialRow } from '@/lib/metrics/extended';

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
  const [savedSnapshot, setSavedSnapshot] = useState({
    cutoffDays: initialCutoffDays,
    pricing: initialPricing,
  });
  const dirty =
    cutoffDays !== savedSnapshot.cutoffDays ||
    pricing.onePerWeek !== savedSnapshot.pricing.onePerWeek ||
    pricing.twoPerWeek !== savedSnapshot.pricing.twoPerWeek ||
    pricing.threePerWeek !== savedSnapshot.pricing.threePerWeek;

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
      setSavedSnapshot({ cutoffDays, pricing });
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  const efficiencyAccent =
    data.total.efficiency >= 150
      ? 'emerald'
      : data.total.efficiency >= 100
        ? 'sky'
        : data.total.efficiency >= 50
          ? 'amber'
          : 'rose';

  return (
    <div className="space-y-4">
      {/* Toolbar: компактная сводка параметров + кнопка настроек */}
      <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-md border p-3 text-xs">
        <span className="text-muted-foreground">Cutoff:</span>
        <span className="font-medium tabular-nums">{cutoffDays} дн</span>
        <span className="text-muted-foreground">({data.cutoffDate})</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Прайс «обычных»:</span>
        <span className="tabular-nums">
          1р <span className="font-medium">{fmtInt(pricing.onePerWeek)}</span> · 2р{' '}
          <span className="font-medium">{fmtInt(pricing.twoPerWeek)}</span> · 3р{' '}
          <span className="font-medium">{fmtInt(pricing.threePerWeek)}</span> грн
        </span>
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="ml-auto">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              {dirty ? 'Параметры •' : 'Параметры'}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Параметры рентабельности</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide">Cutoff, дней</Label>
                <NumInput
                  value={cutoffDays}
                  onChange={(v) => setCutoffDays(Math.max(1, Math.min(365, v)))}
                  step={5}
                />
                <p className="text-muted-foreground text-xs">
                  Отбрасывает учеников младше этого срока — их статистика ещё «смазана».
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide">Прайс «обычных», грн</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">1 раз/нед</div>
                    <NumInput
                      value={pricing.onePerWeek}
                      onChange={(v) => setPricing({ ...pricing, onePerWeek: v })}
                      step={50}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">2 раз/нед</div>
                    <NumInput
                      value={pricing.twoPerWeek}
                      onChange={(v) => setPricing({ ...pricing, twoPerWeek: v })}
                      step={50}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">3 раза/нед</div>
                    <NumInput
                      value={pricing.threePerWeek}
                      onChange={(v) => setPricing({ ...pricing, threePerWeek: v })}
                      step={50}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Применяется глобально, если для предмета не задан свой прайс.
                </p>
              </div>
              <Button className="w-full" disabled={saving || !dirty} onClick={saveSettings}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {dirty ? 'Сохранить' : 'Сохранено'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStat label="Учеников 45+" value={fmtInt(data.total.students)} accent="neutral" />
        <KpiStat
          label="Ожидаемый (обычн.)"
          value={fmtMoney(data.total.expectedRegularIncome)}
          accent="sky"
        />
        <KpiStat
          label="Факт (контракт)"
          value={fmtMoney(data.total.actualContractIncome)}
          accent="emerald"
        />
        <KpiStat
          label="Эффективность"
          value={fmtPercent(data.total.efficiency, 0)}
          hint={`Δ = ${fmtDelta(data.total.delta)}`}
          accent={efficiencyAccent}
          size="lg"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 text-sm font-medium">Контракт vs обычные — по репетиторам</h3>

          {/* Mobile: карточный layout */}
          <div className="space-y-3 md:hidden">
            {data.rows.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Нет учеников старше cutoff. Уменьшите его в параметрах.
              </p>
            ) : (
              data.rows.map((r) => (
                <div key={r.tutorId} className="rounded-md border p-3 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.tutorName}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.subjectName ?? '—'} · {r.students} учеников · {r.avgRetentionDays} дн
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold tabular-nums">
                        {fmtPercent(r.efficiency, 0)}
                      </div>
                      <div
                        className={
                          'text-xs tabular-nums ' +
                          (r.delta >= 0 ? 'text-emerald-700' : 'text-rose-700')
                        }
                      >
                        {fmtDelta(r.delta)}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Пробных 45+</span>
                      <span className="text-foreground tabular-nums">{r.trials45plus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Успех / Отказ</span>
                      <span className="text-foreground tabular-nums">
                        {r.successful} / {r.refused}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>1/2/3р</span>
                      <span className="text-foreground tabular-nums">
                        {r.freq1Pct}/{r.freq2Pct}/{r.freq3Pct}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ср. цена</span>
                      <span className="text-foreground tabular-nums">
                        {fmtInt(r.avgRequestPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ожид. (обычн.)</span>
                      <span className="text-foreground tabular-nums">
                        {fmtMoney(r.expectedRegularIncome)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Факт (контракт)</span>
                      <span className="text-foreground font-medium tabular-nums">
                        {fmtMoney(r.actualContractIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: широкая таблица со скрываемыми второстепенными колонками */}
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-muted/40">
                <tr className="text-muted-foreground text-left uppercase tracking-wide">
                  <th className="px-2 py-2 font-medium">Репетитор</th>
                  <th className="hidden px-2 py-2 font-medium lg:table-cell">Предмет</th>
                  <th className="hidden px-2 py-2 text-right font-medium xl:table-cell">
                    Пробных&nbsp;45+
                  </th>
                  <th className="hidden px-2 py-2 text-right font-medium xl:table-cell">Успех</th>
                  <th className="hidden px-2 py-2 text-right font-medium xl:table-cell">Отказ</th>
                  <th className="hidden px-2 py-2 text-right font-medium lg:table-cell">Успех%</th>
                  <th className="px-2 py-2 text-right font-medium">Учеников</th>
                  <th className="hidden px-2 py-2 text-right font-medium lg:table-cell">Уд., дн</th>
                  <th className="hidden px-2 py-2 text-right font-medium xl:table-cell">1/2/3р</th>
                  <th className="hidden px-2 py-2 text-right font-medium xl:table-cell">
                    Ср. цена
                  </th>
                  <th className="px-2 py-2 text-right font-medium">Ожид.</th>
                  <th className="px-2 py-2 text-right font-medium">Факт</th>
                  <th className="px-2 py-2 text-right font-medium">Δ</th>
                  <th className="px-2 py-2 text-right font-medium">Эфф.%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.length === 0 ? (
                  <tr>
                    <td className="text-muted-foreground py-6 text-center" colSpan={14}>
                      Нет учеников старше cutoff. Уменьшите его в параметрах.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.tutorId} className="hover:bg-muted/20">
                      <td className="px-2 py-2 font-medium">{r.tutorName}</td>
                      <td className="text-muted-foreground hidden px-2 py-2 lg:table-cell">
                        {r.subjectName ?? '—'}
                      </td>
                      <td className="hidden px-2 py-2 text-right tabular-nums xl:table-cell">
                        {r.trials45plus}
                      </td>
                      <td className="hidden px-2 py-2 text-right tabular-nums xl:table-cell">
                        {r.successful}
                      </td>
                      <td className="hidden px-2 py-2 text-right tabular-nums xl:table-cell">
                        {r.refused}
                      </td>
                      <td className="text-muted-foreground hidden px-2 py-2 text-right tabular-nums lg:table-cell">
                        {fmtPercent(r.successRate, 0)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.students}</td>
                      <td className="text-muted-foreground hidden px-2 py-2 text-right tabular-nums lg:table-cell">
                        {r.avgRetentionDays}
                      </td>
                      <td className="text-muted-foreground hidden px-2 py-2 text-right tabular-nums xl:table-cell">
                        {r.freq1Pct}/{r.freq2Pct}/{r.freq3Pct}
                      </td>
                      <td className="text-muted-foreground hidden px-2 py-2 text-right tabular-nums xl:table-cell">
                        {fmtInt(r.avgRequestPrice)}
                      </td>
                      <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
                        {fmtMoney(r.expectedRegularIncome)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {fmtMoney(r.actualContractIncome)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        <span className={r.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {fmtDelta(r.delta)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">
                        {fmtPercent(r.efficiency, 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
