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

      <div className="grid gap-3 md:grid-cols-4">
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
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-muted-foreground text-left uppercase tracking-wide">
                  <th className="px-2 py-2 font-medium">Репетитор</th>
                  <th className="px-2 py-2 font-medium">Предмет</th>
                  <th className="px-2 py-2 text-right font-medium">Пробных&nbsp;45+</th>
                  <th className="px-2 py-2 text-right font-medium">Успех</th>
                  <th className="px-2 py-2 text-right font-medium">Отказ</th>
                  <th className="px-2 py-2 text-right font-medium">Успех%</th>
                  <th className="px-2 py-2 text-right font-medium">Учеников</th>
                  <th className="px-2 py-2 text-right font-medium">Уд., дн</th>
                  <th className="px-2 py-2 text-right font-medium">1/2/3р</th>
                  <th className="px-2 py-2 text-right font-medium">Ср. цена</th>
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
                      <td className="text-muted-foreground px-2 py-2">{r.subjectName ?? '—'}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.trials45plus}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.successful}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.refused}</td>
                      <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
                        {fmtPercent(r.successRate, 0)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.students}</td>
                      <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
                        {r.avgRetentionDays}
                      </td>
                      <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
                        {r.freq1Pct}/{r.freq2Pct}/{r.freq3Pct}
                      </td>
                      <td className="text-muted-foreground px-2 py-2 text-right tabular-nums">
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
              {data.rows.length > 0 ? (
                <tfoot className="bg-muted/30">
                  <tr>
                    <td className="px-2 py-2.5 font-semibold" colSpan={6}>
                      ИТОГО
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                      {fmtInt(data.total.students)}
                    </td>
                    <td className="px-2 py-2.5" colSpan={3} />
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                      {fmtMoney(data.total.expectedRegularIncome)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                      {fmtMoney(data.total.actualContractIncome)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                      <span
                        className={data.total.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                      >
                        {fmtDelta(data.total.delta)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold tabular-nums">
                      {fmtPercent(data.total.efficiency, 0)}
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
