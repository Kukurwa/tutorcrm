'use client';

import { Save } from 'lucide-react';
import { useMemo, useState } from 'react';

import type {
  PayrollConfig,
  PayrollDispatcherCell,
  PayrollRange,
  PayrollRopRow,
} from '@tutorcrm/contracts';
import { TENURE_BUCKETS, TENURE_LABELS } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  Input,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@tutorcrm/ui';

import { NumInput } from '@/components/ui/num-input';
import { api, ApiClientError } from '@/lib/api-client';
import { fmtInt, fmtMoney } from '@/lib/format-num';
import {
  computeDispatcherSalary,
  computeDispatcherTurnovers,
  computeRopBreakdown,
  currentMonthKey,
  formatMonthKey,
  formatRange,
  parseMonthKey,
  tenureBucket,
  tenureMonths,
} from '@/lib/payroll/calc';

interface DispatcherRow {
  id: string;
  name: string;
  hireDate: string | null;
}

interface ContractRow {
  dispatcherId: string | null;
  amountReceived: number | null;
  commissionRate: number;
  paidAt: string | null;
}

interface OneTimePaymentRow {
  requestId: string;
  amount: number;
  status: string;
  paidAt: string | null;
}

interface RequestRow {
  id: string;
  dispatcherId: string | null;
}

interface Props {
  initialConfig: PayrollConfig;
  dispatchers: DispatcherRow[];
  contracts: ContractRow[];
  oneTimePayments: OneTimePaymentRow[];
  requests: RequestRow[];
}

export function PayrollView({
  initialConfig,
  dispatchers,
  contracts,
  oneTimePayments,
  requests,
}: Props) {
  const [config, setConfig] = useState<PayrollConfig>(initialConfig);
  const [savedConfig, setSavedConfig] = useState<PayrollConfig>(initialConfig);
  const [monthValue, setMonthValue] = useState<string>(formatMonthKey(currentMonthKey()));

  const month = useMemo(() => parseMonthKey(monthValue), [monthValue]);

  const turnovers = useMemo(
    () =>
      computeDispatcherTurnovers({
        dispatchers,
        contracts,
        oneTimePayments,
        requests,
        month,
      }),
    [dispatchers, contracts, oneTimePayments, requests, month],
  );

  const ropDirty = config.ropScale !== savedConfig.ropScale;
  const matrixDirty =
    config.dispatcherMatrix !== savedConfig.dispatcherMatrix ||
    config.dispatcherRanges !== savedConfig.dispatcherRanges;

  async function save(
    patch: Partial<Pick<PayrollConfig, 'ropScale' | 'dispatcherRanges' | 'dispatcherMatrix'>>,
  ) {
    try {
      const res = await api.patch<{ config: PayrollConfig }>('/api/payroll/config', patch);
      setConfig(res.config);
      setSavedConfig(res.config);
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка сохранения');
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: пикер месяца + tabs справа */}
      <div className="bg-background sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 px-1 pb-2">
        <Input
          type="month"
          className="h-9 w-full sm:w-44"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
        />
        <span className="text-muted-foreground hidden text-xs lg:inline">
          Расчёт за выбранный месяц по фактическим оплатам и контракт-комиссиям
        </span>
      </div>

      <Tabs defaultValue="rop" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rop">ЗП РОПа</TabsTrigger>
          <TabsTrigger value="dispatcher">ЗП диспетчеров</TabsTrigger>
        </TabsList>

        <TabsContent value="rop">
          <Card>
            <SectionHeader
              title="Прогрессивная шкала"
              hint="ЗП = Σ (оборот × % + фикс. ставка) по диспетчерам с оборотом > 0"
              dirty={ropDirty}
              onSave={() => save({ ropScale: config.ropScale })}
            />
            <RopScaleTable
              rows={config.ropScale}
              onChange={(rows) => setConfig((c) => ({ ...c, ropScale: rows }))}
            />
            <Separator />
            <RopBreakdown config={config} dispatchers={dispatchers} turnovers={turnovers} />
          </Card>
        </TabsContent>

        <TabsContent value="dispatcher">
          <Card>
            <SectionHeader
              title="Матрица диспетчеров"
              hint="Строки — диапазон оборота, колонки — стаж работы"
              dirty={matrixDirty}
              onSave={() =>
                save({
                  dispatcherMatrix: config.dispatcherMatrix,
                  dispatcherRanges: config.dispatcherRanges,
                })
              }
            />
            <DispatcherMatrix
              ranges={config.dispatcherRanges}
              matrix={config.dispatcherMatrix}
              onChangeRanges={(ranges) => setConfig((c) => ({ ...c, dispatcherRanges: ranges }))}
              onChangeMatrix={(matrix) => setConfig((c) => ({ ...c, dispatcherMatrix: matrix }))}
            />
            <Separator />
            <DispatcherSalaries config={config} dispatchers={dispatchers} turnovers={turnovers} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionHeader({
  title,
  hint,
  dirty,
  onSave,
}: {
  title: string;
  hint?: string;
  dirty: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-6 sm:px-6">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">{title}</h2>
        {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
      </div>
      <Button size="sm" variant={dirty ? 'default' : 'outline'} disabled={!dirty} onClick={onSave}>
        <Save className="mr-1.5 h-3.5 w-3.5" />
        {dirty ? 'Сохранить' : 'Сохранено'}
      </Button>
    </div>
  );
}

// =================== РОП: шкала + расчёт ===================

function RopScaleTable({
  rows,
  onChange,
}: {
  rows: PayrollRopRow[];
  onChange: (rows: PayrollRopRow[]) => void;
}) {
  function update(idx: number, patch: Partial<PayrollRopRow>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function updateBoundary(idx: number, value: number) {
    const next = rows.map((r) => ({ ...r }));
    const cur = next[idx];
    if (!cur) return;
    cur.to = value;
    const nxt = next[idx + 1];
    if (nxt) nxt.from = value + 1;
    onChange(next);
  }

  return (
    <div className="px-3 pb-6 sm:px-6">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-muted/40">
            <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Диапазон оборота, грн</th>
              <th className="w-32 px-3 py-2 font-medium">% с оборота</th>
              <th className="w-40 px-3 py-2 font-medium">Фикс. ставка</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const isLast = idx === rows.length - 1;
              return (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 text-right tabular-nums">
                        {fmtInt(row.from)}
                      </span>
                      <span className="text-muted-foreground">–</span>
                      {isLast ? (
                        <span className="text-muted-foreground">+</span>
                      ) : (
                        <NumInput
                          value={row.to ?? 0}
                          onChange={(v) => updateBoundary(idx, v)}
                          className="w-32"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={row.percent}
                      onChange={(v) => update(idx, { percent: v })}
                      decimals={1}
                      suffix="%"
                      step={0.5}
                      max={100}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={row.fixed}
                      onChange={(v) => update(idx, { fixed: v })}
                      suffix="грн"
                      step={500}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RopBreakdown({
  config,
  dispatchers,
  turnovers,
}: {
  config: PayrollConfig;
  dispatchers: DispatcherRow[];
  turnovers: ReturnType<typeof computeDispatcherTurnovers>;
}) {
  const breakdown = useMemo(() => computeRopBreakdown({ config, turnovers }), [config, turnovers]);
  const dispatcherById = useMemo(() => new Map(dispatchers.map((d) => [d.id, d])), [dispatchers]);

  return (
    <CardContent className="space-y-3 px-3 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Расчёт ЗП РОПа за период</h3>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40">
            <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Диспетчер</th>
              <th className="px-3 py-2 text-right font-medium">Оборот</th>
              <th className="px-3 py-2 text-right font-medium">% по шкале</th>
              <th className="px-3 py-2 text-right font-medium">Ставка</th>
              <th className="px-3 py-2 text-right font-medium">% × оборот</th>
              <th className="px-3 py-2 text-right font-medium">Итого</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {breakdown.rows.map((r) => (
              <tr key={r.dispatcherId} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">
                  {dispatcherById.get(r.dispatcherId)?.name ?? r.dispatcherId}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.turnover)}</td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {r.row.percent}%
                </td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {fmtMoney(r.fixedPart)}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {fmtMoney(r.percentPart)}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {fmtMoney(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30">
            <tr>
              <td className="px-3 py-2.5 text-sm font-semibold" colSpan={5}>
                ИТОГО ЗП РОПа
              </td>
              <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">
                {fmtMoney(breakdown.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </CardContent>
  );
}

// =================== Диспетчеры: матрица + расчёт ===================

function DispatcherMatrix({
  ranges,
  matrix,
  onChangeRanges,
  onChangeMatrix,
}: {
  ranges: PayrollRange[];
  matrix: PayrollDispatcherCell[][];
  onChangeRanges: (next: PayrollRange[]) => void;
  onChangeMatrix: (next: PayrollDispatcherCell[][]) => void;
}) {
  function updateCell(rowIdx: number, colIdx: number, patch: Partial<PayrollDispatcherCell>) {
    onChangeMatrix(
      matrix.map((row, i) =>
        i === rowIdx ? row.map((c, j) => (j === colIdx ? { ...c, ...patch } : c)) : row,
      ),
    );
  }

  function updateBoundary(idx: number, value: number) {
    const next = ranges.map((r) => ({ ...r }));
    const cur = next[idx];
    if (!cur) return;
    cur.to = value;
    const nxt = next[idx + 1];
    if (nxt) nxt.from = value + 1;
    onChangeRanges(next);
  }

  return (
    <div className="px-3 pb-6 sm:px-6">
      {/* Mobile: каждый диапазон — карточка с stacked-полями по стажу */}
      <div className="space-y-3 lg:hidden">
        {ranges.map((range, rowIdx) => {
          const isLast = rowIdx === ranges.length - 1;
          return (
            <div key={rowIdx} className="rounded-md border p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Оборот, грн
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {fmtInt(range.from)}
                  </span>
                  <span className="text-muted-foreground">–</span>
                  {isLast ? (
                    <span className="text-muted-foreground">+</span>
                  ) : (
                    <NumInput
                      value={range.to ?? 0}
                      onChange={(v) => updateBoundary(rowIdx, v)}
                      className="w-28"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {(matrix[rowIdx] ?? []).map((cell, colIdx) => (
                  <div key={colIdx} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 text-xs">
                      {TENURE_LABELS[TENURE_BUCKETS[colIdx]!]}
                    </span>
                    <NumInput
                      value={cell.percent}
                      onChange={(v) => updateCell(rowIdx, colIdx, { percent: v })}
                      decimals={1}
                      suffix="%"
                      step={0.5}
                      max={100}
                      className="w-20"
                    />
                    <span className="text-muted-foreground text-xs">+</span>
                    <NumInput
                      value={cell.fixed}
                      onChange={(v) => updateCell(rowIdx, colIdx, { fixed: v })}
                      step={500}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop (lg+): полноразмерная матрица 5×5 */}
      <div className="hidden overflow-x-auto rounded-md border lg:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40">
            <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Диапазон оборота, грн</th>
              {TENURE_BUCKETS.map((b) => (
                <th key={b} className="px-3 py-2 text-center font-medium">
                  {TENURE_LABELS[b]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {ranges.map((range, rowIdx) => {
              const isLast = rowIdx === ranges.length - 1;
              return (
                <tr key={rowIdx} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 text-right tabular-nums">
                        {fmtInt(range.from)}
                      </span>
                      <span className="text-muted-foreground">–</span>
                      {isLast ? (
                        <span className="text-muted-foreground">+</span>
                      ) : (
                        <NumInput
                          value={range.to ?? 0}
                          onChange={(v) => updateBoundary(rowIdx, v)}
                          className="w-28"
                        />
                      )}
                    </div>
                  </td>
                  {(matrix[rowIdx] ?? []).map((cell, colIdx) => (
                    <td key={colIdx} className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <NumInput
                          value={cell.percent}
                          onChange={(v) => updateCell(rowIdx, colIdx, { percent: v })}
                          decimals={1}
                          suffix="%"
                          step={0.5}
                          max={100}
                          className="w-20"
                        />
                        <span className="text-muted-foreground text-xs">+</span>
                        <NumInput
                          value={cell.fixed}
                          onChange={(v) => updateCell(rowIdx, colIdx, { fixed: v })}
                          step={500}
                          className="w-24"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DispatcherSalaries({
  config,
  dispatchers,
  turnovers,
}: {
  config: PayrollConfig;
  dispatchers: DispatcherRow[];
  turnovers: ReturnType<typeof computeDispatcherTurnovers>;
}) {
  const turnoverById = useMemo(
    () => new Map(turnovers.map((t) => [t.dispatcherId, t])),
    [turnovers],
  );

  const rows = dispatchers.map((d) => {
    const t = turnoverById.get(d.id);
    const turnover = t?.total ?? 0;
    const salary = computeDispatcherSalary({ config, turnover, hireDate: d.hireDate });
    const months = tenureMonths(d.hireDate);
    const bucket = tenureBucket(months);
    const range = config.dispatcherRanges[salary.rangeIndex] ?? { from: 0, to: null };
    return { d, t, turnover, salary, months, bucket, range };
  });

  const total = rows.reduce((sum, r) => sum + r.salary.total, 0);

  return (
    <CardContent className="space-y-3 px-3 pt-6 sm:px-6">
      <h3 className="text-sm font-medium">Расчёт ЗП диспетчеров за период</h3>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/40">
            <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Диспетчер</th>
              <th className="px-3 py-2 font-medium">Стаж</th>
              <th className="px-3 py-2 text-right font-medium">Контракты</th>
              <th className="px-3 py-2 text-right font-medium">Разовые</th>
              <th className="px-3 py-2 text-right font-medium">Оборот</th>
              <th className="px-3 py-2 font-medium">Ячейка</th>
              <th className="px-3 py-2 text-right font-medium">Итого</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ d, t, turnover, salary, months, bucket, range }) => (
              <tr key={d.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{d.name}</td>
                <td className="px-3 py-2">
                  {d.hireDate ? (
                    <div className="text-xs">
                      <div>{months} мес</div>
                      <div className="text-muted-foreground">{TENURE_LABELS[bucket]}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {fmtMoney(t?.contractCommissions ?? 0)}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {fmtMoney(t?.oneTimeRevenue ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {fmtMoney(turnover)}
                </td>
                <td className="px-3 py-2">
                  <div className="text-xs">
                    <div className="text-muted-foreground">{formatRange(range)}</div>
                    <div>
                      {salary.cell.percent}% + {fmtMoney(salary.cell.fixed)}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {fmtMoney(salary.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30">
            <tr>
              <td className="px-3 py-2.5 text-sm font-semibold" colSpan={6}>
                ИТОГО ЗП диспетчеров
              </td>
              <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">
                {fmtMoney(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </CardContent>
  );
}
