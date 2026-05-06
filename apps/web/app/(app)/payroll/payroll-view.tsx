'use client';

import { useMemo, useState } from 'react';

import type {
  PayrollConfig,
  PayrollDispatcherCell,
  PayrollRopRow,
  PayrollRange,
} from '@tutorcrm/contracts';
import { TENURE_BUCKETS, TENURE_LABELS } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
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

const fmtMoney = (n: number) => `${n.toLocaleString('ru-RU')} грн`;

export function PayrollView({
  initialConfig,
  dispatchers,
  contracts,
  oneTimePayments,
  requests,
}: Props) {
  const [config, setConfig] = useState<PayrollConfig>(initialConfig);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Период</CardTitle>
          <Input
            type="month"
            className="h-9 w-44"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </CardHeader>
      </Card>

      <Tabs defaultValue="rop">
        <TabsList>
          <TabsTrigger value="rop">ЗП РОПа</TabsTrigger>
          <TabsTrigger value="dispatcher">ЗП диспетчеров</TabsTrigger>
        </TabsList>

        <TabsContent value="rop" className="space-y-4">
          <RopScaleCard
            config={config}
            onChange={(ropScale) => setConfig((c) => ({ ...c, ropScale }))}
            dispatcherRanges={config.dispatcherRanges}
            onSave={(ropScale) => saveConfig(setConfig, { ropScale })}
          />
          <RopBreakdownCard config={config} dispatchers={dispatchers} turnovers={turnovers} />
        </TabsContent>

        <TabsContent value="dispatcher" className="space-y-4">
          <DispatcherMatrixCard
            config={config}
            onChange={(matrix, ranges) =>
              setConfig((c) => ({
                ...c,
                dispatcherMatrix: matrix,
                dispatcherRanges: ranges ?? c.dispatcherRanges,
              }))
            }
            onSave={(payload) => saveConfig(setConfig, payload)}
          />
          <DispatcherSalaryCard config={config} dispatchers={dispatchers} turnovers={turnovers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function saveConfig(
  setConfig: (updater: (prev: PayrollConfig) => PayrollConfig) => void,
  patch: Partial<Pick<PayrollConfig, 'ropScale' | 'dispatcherRanges' | 'dispatcherMatrix'>>,
) {
  try {
    const res = await api.patch<{ config: PayrollConfig }>('/api/payroll/config', patch);
    setConfig(() => res.config);
    toast.success('Сохранено');
  } catch (err) {
    toast.error(err instanceof ApiClientError ? err.message : 'Ошибка сохранения');
  }
}

// =================== РОП ===================

function RopScaleCard({
  config,
  onChange,
  dispatcherRanges,
  onSave,
}: {
  config: PayrollConfig;
  onChange: (rows: PayrollRopRow[]) => void;
  dispatcherRanges: PayrollRange[];
  onSave: (rows: PayrollRopRow[]) => void;
}) {
  function update(idx: number, patch: Partial<PayrollRopRow>) {
    const next = config.ropScale.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  }

  // Меняем границу диапазона: правим row.to и .from следующей строки.
  function updateBoundary(idx: number, value: number) {
    const next = config.ropScale.map((r) => ({ ...r }));
    const cur = next[idx];
    if (!cur) return;
    cur.to = value;
    const nxt = next[idx + 1];
    if (nxt) nxt.from = value + 1;
    onChange(next);
  }

  const rangesDiverge = useMemo(
    () =>
      config.ropScale.some((r, i) => {
        const dr = dispatcherRanges[i];
        return !dr || r.from !== dr.from || r.to !== dr.to;
      }),
    [config.ropScale, dispatcherRanges],
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Прогрессивная шкала РОПа</CardTitle>
          <p className="text-muted-foreground text-xs">
            ЗП РОПа = Σ (оборот диспетчера × % + фикс. ставка) по диспетчерам с оборотом &gt; 0.
          </p>
        </div>
        <Button size="sm" onClick={() => onSave(config.ropScale)}>
          Сохранить
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="py-2 pr-3 font-medium">Диапазон оборота, грн</th>
                <th className="py-2 pr-3 font-medium">% с оборота</th>
                <th className="py-2 font-medium">Фикс. ставка</th>
              </tr>
            </thead>
            <tbody>
              {config.ropScale.map((row, idx) => {
                const isLast = idx === config.ropScale.length - 1;
                return (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground tabular-nums">
                          {row.from.toLocaleString('ru-RU')}
                        </span>
                        <span className="text-muted-foreground">–</span>
                        {isLast ? (
                          <span className="text-muted-foreground">+</span>
                        ) : (
                          <Input
                            type="number"
                            className="h-8 w-32 tabular-nums"
                            value={row.to ?? 0}
                            onChange={(e) => updateBoundary(idx, Number(e.target.value) || 0)}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8 w-24 tabular-nums"
                        value={row.percent}
                        onChange={(e) => update(idx, { percent: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        type="number"
                        className="h-8 w-32 tabular-nums"
                        value={row.fixed}
                        onChange={(e) => update(idx, { fixed: Number(e.target.value) || 0 })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rangesDiverge ? (
          <p className="text-muted-foreground mt-3 text-xs">
            Подсказка: диапазоны РОПа отличаются от диапазонов матрицы диспетчеров. Это допустимо —
            но обычно их держат синхронными.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RopBreakdownCard({
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Расчёт ЗП РОПа за период</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="py-2 pr-3 font-medium">Диспетчер</th>
                <th className="py-2 pr-3 text-right font-medium">Оборот</th>
                <th className="py-2 pr-3 text-right font-medium">% по шкале</th>
                <th className="py-2 pr-3 text-right font-medium">Ставка</th>
                <th className="py-2 pr-3 text-right font-medium">% × оборот</th>
                <th className="py-2 text-right font-medium">Итого</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.rows.map((r) => (
                <tr key={r.dispatcherId} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">
                    {dispatcherById.get(r.dispatcherId)?.name ?? r.dispatcherId}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.turnover)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.row.percent}%</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.fixedPart)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.percentPart)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {fmtMoney(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td className="py-2 pr-3 font-semibold" colSpan={5}>
                  ИТОГО ЗП РОПа
                </td>
                <td className="py-2 text-right text-base font-bold tabular-nums">
                  {fmtMoney(breakdown.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// =================== Диспетчер ===================

function DispatcherMatrixCard({
  config,
  onChange,
  onSave,
}: {
  config: PayrollConfig;
  onChange: (matrix: PayrollDispatcherCell[][], ranges?: PayrollRange[]) => void;
  onSave: (
    payload: Pick<PayrollConfig, 'dispatcherMatrix'> &
      Partial<Pick<PayrollConfig, 'dispatcherRanges'>>,
  ) => void;
}) {
  function updateCell(rowIdx: number, colIdx: number, patch: Partial<PayrollDispatcherCell>) {
    const next = config.dispatcherMatrix.map((row, i) =>
      i === rowIdx ? row.map((c, j) => (j === colIdx ? { ...c, ...patch } : c)) : row,
    );
    onChange(next);
  }

  function updateRangeBoundary(idx: number, value: number) {
    const next = config.dispatcherRanges.map((r) => ({ ...r }));
    const cur = next[idx];
    if (!cur) return;
    cur.to = value;
    const nxt = next[idx + 1];
    if (nxt) nxt.from = value + 1;
    onChange(config.dispatcherMatrix, next);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Матрица диспетчеров</CardTitle>
          <p className="text-muted-foreground text-xs">
            Строки — диапазоны оборота, колонки — стаж. ЗП = оборот × % + фикс. ставка.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              dispatcherMatrix: config.dispatcherMatrix,
              dispatcherRanges: config.dispatcherRanges,
            })
          }
        >
          Сохранить
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="py-2 pr-3 font-medium">Сумма заявок, грн</th>
                {TENURE_BUCKETS.map((b) => (
                  <th key={b} className="py-2 pr-3 text-center font-medium">
                    {TENURE_LABELS[b]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.dispatcherRanges.map((range, rowIdx) => {
                const isLast = rowIdx === config.dispatcherRanges.length - 1;
                return (
                  <tr key={rowIdx} className="border-b align-top last:border-0">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="tabular-nums">{range.from.toLocaleString('ru-RU')}</span>
                        <span className="text-muted-foreground">–</span>
                        {isLast ? (
                          <span className="text-muted-foreground">+</span>
                        ) : (
                          <Input
                            type="number"
                            className="h-7 w-28 tabular-nums"
                            value={range.to ?? 0}
                            onChange={(e) =>
                              updateRangeBoundary(rowIdx, Number(e.target.value) || 0)
                            }
                          />
                        )}
                      </div>
                    </td>
                    {(config.dispatcherMatrix[rowIdx] ?? []).map((c, colIdx) => (
                      <td key={colIdx} className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            className="h-7 w-16 tabular-nums"
                            value={c.percent}
                            onChange={(e) =>
                              updateCell(rowIdx, colIdx, {
                                percent: Number(e.target.value) || 0,
                              })
                            }
                          />
                          <span className="text-muted-foreground">% +</span>
                          <Input
                            type="number"
                            className="h-7 w-20 tabular-nums"
                            value={c.fixed}
                            onChange={(e) =>
                              updateCell(rowIdx, colIdx, {
                                fixed: Number(e.target.value) || 0,
                              })
                            }
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
      </CardContent>
    </Card>
  );
}

function DispatcherSalaryCard({
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

  const total = useMemo(
    () =>
      dispatchers.reduce((sum, d) => {
        const t = turnoverById.get(d.id);
        if (!t) return sum;
        const s = computeDispatcherSalary({
          config,
          turnover: t.total,
          hireDate: d.hireDate,
        });
        return sum + s.total;
      }, 0),
    [dispatchers, turnoverById, config],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Расчёт ЗП диспетчеров за период</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="py-2 pr-3 font-medium">Диспетчер</th>
                <th className="py-2 pr-3 font-medium">Стаж</th>
                <th className="py-2 pr-3 text-right font-medium">Контракт-комиссии</th>
                <th className="py-2 pr-3 text-right font-medium">Разовые</th>
                <th className="py-2 pr-3 text-right font-medium">Оборот</th>
                <th className="py-2 pr-3 font-medium">Ячейка</th>
                <th className="py-2 pr-3 text-right font-medium">% × оборот</th>
                <th className="py-2 pr-3 text-right font-medium">Ставка</th>
                <th className="py-2 text-right font-medium">Итого</th>
              </tr>
            </thead>
            <tbody>
              {dispatchers.map((d) => {
                const t = turnoverById.get(d.id);
                const turnover = t?.total ?? 0;
                const s = computeDispatcherSalary({
                  config,
                  turnover,
                  hireDate: d.hireDate,
                });
                const months = tenureMonths(d.hireDate);
                const bucket = tenureBucket(months);
                const range = config.dispatcherRanges[s.rangeIndex] ?? {
                  from: 0,
                  to: null,
                };
                return (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{d.name}</td>
                    <td className="py-2 pr-3 text-xs">
                      {d.hireDate ? (
                        <>
                          {months} мес
                          <div className="text-muted-foreground">{TENURE_LABELS[bucket]}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtMoney(t?.contractCommissions ?? 0)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtMoney(t?.oneTimeRevenue ?? 0)}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums">
                      {fmtMoney(turnover)}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      <div className="text-muted-foreground">{formatRange(range)}</div>
                      <div>
                        {s.cell.percent}% + {fmtMoney(s.cell.fixed)}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(s.percentPart)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(s.fixedPart)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {fmtMoney(s.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td className="py-2 pr-3 font-semibold" colSpan={8}>
                  ИТОГО ЗП диспетчеров
                </td>
                <td className="py-2 text-right text-base font-bold tabular-nums">
                  {fmtMoney(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
