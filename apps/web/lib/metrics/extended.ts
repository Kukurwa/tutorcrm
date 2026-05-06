/**
 * Расширенные метрики из PDF «Правки-2»:
 * 1. Общая прибыль за период (контракт / разовые / по диспетчерам)
 * 2. План/Факт по диспетчер × предмету
 * 3. Метрика контрактных (прибыль по диспетчер / предмет / репетитор × месяц)
 * 4. Рентабельность контрактных (контракт vs обычные, с cutoff)
 * 5. Удержание клиентов на контрактах
 * 6. Метрики взаимодействия диспетчера + SLA
 */

import type { RegularPricing } from '@tutorcrm/contracts';

import { daysBetween, inMonth, monthFromIso, type MonthKey, monthsDiff } from './period';

// ====== общие типы входных данных ======

export interface ContractRow {
  id: string;
  dispatcherId: string | null;
  tutorId: string;
  tutorName: string;
  subjectId: string | null;
  subjectName: string | null;
  amountReceived: number | null;
  commissionRate: number;
  paidAt: string | null;
  trialAt: string | null;
  startedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  status: 'active' | 'paused' | 'closed_won' | 'closed_lost';
  lessonsPerWeek: number | null;
  requestPrice: string | null; // строка с числом или «Договорная»
}

export interface OneTimePaymentRow {
  requestId: string;
  amount: number;
  status: 'pending' | 'paid' | 'missed';
  paidAt: string | null;
}

export interface RequestRow {
  id: string;
  dispatcherId: string | null;
  subjectId: string | null;
  subjectName: string | null;
  stage:
    | 'lead_created'
    | 'request_created'
    | 'published'
    | 'searching_tutor'
    | 'tutor_found'
    | 'trial_scheduled'
    | 'trial_done'
    | 'active'
    | 'closed_won'
    | 'closed_lost';
  requestPrice: string | null;
  rejectionReasonId: string | null;
  assignedTutorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrialRow {
  id: string;
  requestId: string;
  tutorId: string;
  scheduledAt: string;
  result: 'success' | 'fail' | null;
}

export interface DispatcherRow {
  id: string;
  name: string;
}

export interface DialogRow {
  id: string;
  dispatcherId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadRow {
  id: string;
  dispatcherId: string | null;
  createdAt: string;
}

export interface SubjectRow {
  id: string;
  name: string;
}

export interface RejectionReasonRow {
  id: string;
  label: string;
}

// ====== утилиты ======

const parsePrice = (s: string | null): number => {
  if (!s) return 0;
  const m = s.replace(/\s/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

const isTerminal = (s: string): boolean => s === 'closed_won' || s === 'closed_lost';

const contractCommission = (c: ContractRow): number =>
  Math.round((c.amountReceived ?? 0) * c.commissionRate);

// =====================================================================
// 1. ОБЩАЯ ПРИБЫЛЬ ЗА ПЕРИОД
// =====================================================================

export interface ProfitByDispatcher {
  dispatcherId: string;
  name: string;
  contractProfit: number;
  oneTimeProfit: number;
  total: number;
}

export interface ProfitResult {
  contractProfit: number;
  oneTimeProfit: number;
  total: number;
  byDispatcher: ProfitByDispatcher[];
}

export function computeProfit(args: {
  dispatchers: DispatcherRow[];
  contracts: ContractRow[];
  oneTimePayments: OneTimePaymentRow[];
  requests: RequestRow[];
  month: MonthKey;
}): ProfitResult {
  const { dispatchers, contracts, oneTimePayments, requests, month } = args;
  const reqById = new Map(requests.map((r) => [r.id, r]));

  let contractProfit = 0;
  let oneTimeProfit = 0;
  const byDispatcher = new Map<string, ProfitByDispatcher>();

  for (const d of dispatchers) {
    byDispatcher.set(d.id, {
      dispatcherId: d.id,
      name: d.name,
      contractProfit: 0,
      oneTimeProfit: 0,
      total: 0,
    });
  }

  for (const c of contracts) {
    if (!inMonth(c.paidAt, month)) continue;
    const profit = contractCommission(c);
    contractProfit += profit;
    if (c.dispatcherId && byDispatcher.has(c.dispatcherId)) {
      const row = byDispatcher.get(c.dispatcherId)!;
      row.contractProfit += profit;
    }
  }

  for (const p of oneTimePayments) {
    if (p.status !== 'paid' || !inMonth(p.paidAt, month)) continue;
    oneTimeProfit += p.amount;
    const req = reqById.get(p.requestId);
    if (req?.dispatcherId && byDispatcher.has(req.dispatcherId)) {
      const row = byDispatcher.get(req.dispatcherId)!;
      row.oneTimeProfit += p.amount;
    }
  }

  for (const row of byDispatcher.values()) {
    row.total = row.contractProfit + row.oneTimeProfit;
  }

  return {
    contractProfit,
    oneTimeProfit,
    total: contractProfit + oneTimeProfit,
    byDispatcher: [...byDispatcher.values()].sort((a, b) => b.total - a.total),
  };
}

// =====================================================================
// 2. ПЛАН/ФАКТ
// =====================================================================

export interface PlanFactCellRow {
  subjectId: string;
  subjectName: string;
  dispatcherId: string;
  dispatcherName: string;
  plan: number;
  fact: number;
  diff: number;
  successRate: number; // 0..100
  countTotal: number;
  countWon: number;
}

export interface PlanFactRejectionRow {
  reasonId: string;
  reasonLabel: string;
  count: number;
  lostSum: number;
}

export interface PlanFactResult {
  rows: PlanFactCellRow[];
  byDispatcher: {
    dispatcherId: string;
    name: string;
    plan: number;
    fact: number;
    successRate: number;
  }[];
  bySubject: { subjectId: string; name: string; plan: number; fact: number; successRate: number }[];
  total: { plan: number; fact: number; successRate: number };
  rejections: PlanFactRejectionRow[];
}

export function computePlanFact(args: {
  dispatchers: DispatcherRow[];
  subjects: SubjectRow[];
  requests: RequestRow[];
  rejectionReasons: RejectionReasonRow[];
  month: MonthKey;
}): PlanFactResult {
  const { dispatchers, subjects, requests, rejectionReasons, month } = args;
  const dispatcherName = new Map(dispatchers.map((d) => [d.id, d.name]));
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const reasonLabel = new Map(rejectionReasons.map((r) => [r.id, r.label]));

  // Заявки в плане/факте — только те, где в выбранном месяце наступил конечный результат.
  const pool = requests.filter(
    (r) => isTerminal(r.stage) && r.dispatcherId && r.subjectId && inMonth(r.updatedAt, month),
  );

  const cellMap = new Map<string, PlanFactCellRow>();
  const bySubjectMap = new Map<
    string,
    {
      subjectId: string;
      name: string;
      plan: number;
      fact: number;
      countTotal: number;
      countWon: number;
    }
  >();
  const byDispatcherMap = new Map<
    string,
    {
      dispatcherId: string;
      name: string;
      plan: number;
      fact: number;
      countTotal: number;
      countWon: number;
    }
  >();
  const rejMap = new Map<string, PlanFactRejectionRow>();

  let plan = 0;
  let fact = 0;

  for (const r of pool) {
    const price = parsePrice(r.requestPrice);
    plan += price;
    const won = r.stage === 'closed_won';
    if (won) fact += price;

    const cellKey = `${r.subjectId}::${r.dispatcherId}`;
    const existing = cellMap.get(cellKey) ?? {
      subjectId: r.subjectId!,
      subjectName: subjectName.get(r.subjectId!) ?? r.subjectName ?? '—',
      dispatcherId: r.dispatcherId!,
      dispatcherName: dispatcherName.get(r.dispatcherId!) ?? r.dispatcherId!,
      plan: 0,
      fact: 0,
      diff: 0,
      successRate: 0,
      countTotal: 0,
      countWon: 0,
    };
    existing.plan += price;
    existing.countTotal += 1;
    if (won) {
      existing.fact += price;
      existing.countWon += 1;
    }
    cellMap.set(cellKey, existing);

    // По предмету
    {
      const e = bySubjectMap.get(r.subjectId!) ?? {
        subjectId: r.subjectId!,
        name: subjectName.get(r.subjectId!) ?? r.subjectName ?? '—',
        plan: 0,
        fact: 0,
        countTotal: 0,
        countWon: 0,
      };
      e.plan += price;
      e.countTotal += 1;
      if (won) {
        e.fact += price;
        e.countWon += 1;
      }
      bySubjectMap.set(r.subjectId!, e);
    }

    // По диспетчеру
    {
      const e = byDispatcherMap.get(r.dispatcherId!) ?? {
        dispatcherId: r.dispatcherId!,
        name: dispatcherName.get(r.dispatcherId!) ?? r.dispatcherId!,
        plan: 0,
        fact: 0,
        countTotal: 0,
        countWon: 0,
      };
      e.plan += price;
      e.countTotal += 1;
      if (won) {
        e.fact += price;
        e.countWon += 1;
      }
      byDispatcherMap.set(r.dispatcherId!, e);
    }

    // Причины отказа
    if (r.stage === 'closed_lost' && r.rejectionReasonId) {
      const e = rejMap.get(r.rejectionReasonId) ?? {
        reasonId: r.rejectionReasonId,
        reasonLabel: reasonLabel.get(r.rejectionReasonId) ?? r.rejectionReasonId,
        count: 0,
        lostSum: 0,
      };
      e.count += 1;
      e.lostSum += price;
      rejMap.set(r.rejectionReasonId, e);
    }
  }

  for (const c of cellMap.values()) {
    c.diff = c.fact - c.plan;
    c.successRate = c.plan > 0 ? Math.round((c.fact / c.plan) * 100) : 0;
  }

  return {
    rows: [...cellMap.values()].sort(
      (a, b) =>
        a.subjectName.localeCompare(b.subjectName) ||
        a.dispatcherName.localeCompare(b.dispatcherName),
    ),
    byDispatcher: [...byDispatcherMap.values()]
      .map((e) => ({
        dispatcherId: e.dispatcherId,
        name: e.name,
        plan: e.plan,
        fact: e.fact,
        successRate: e.plan > 0 ? Math.round((e.fact / e.plan) * 100) : 0,
      }))
      .sort((a, b) => b.fact - a.fact),
    bySubject: [...bySubjectMap.values()]
      .map((e) => ({
        subjectId: e.subjectId,
        name: e.name,
        plan: e.plan,
        fact: e.fact,
        successRate: e.plan > 0 ? Math.round((e.fact / e.plan) * 100) : 0,
      }))
      .sort((a, b) => b.fact - a.fact),
    total: {
      plan,
      fact,
      successRate: plan > 0 ? Math.round((fact / plan) * 100) : 0,
    },
    rejections: [...rejMap.values()].sort((a, b) => b.lostSum - a.lostSum),
  };
}

// =====================================================================
// 3. МЕТРИКА КОНТРАКТНЫХ — прибыль по диспетчер/предмет/репетитор × месяц
// =====================================================================

export interface ContractMetricRow {
  key: string;
  name: string;
  byMonth: Record<string, number>; // 'YYYY-MM' → грн
  total: number;
}

export interface ContractMetricsResult {
  bySubject: ContractMetricRow[];
  byDispatcher: ContractMetricRow[];
  byTutor: ContractMetricRow[];
  monthTotals: Record<string, number>;
  grandTotal: number;
}

export function computeContractMetrics(args: {
  contracts: ContractRow[];
  dispatchers: DispatcherRow[];
  subjects: SubjectRow[];
  months: MonthKey[]; // упорядоченные
}): ContractMetricsResult {
  const { contracts, dispatchers, subjects, months } = args;
  const dispatcherName = new Map(dispatchers.map((d) => [d.id, d.name]));
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

  const monthKeys = months.map((m) => `${m.year}-${String(m.month).padStart(2, '0')}`);
  const blank = (): Record<string, number> => Object.fromEntries(monthKeys.map((k) => [k, 0]));

  const bySubjectMap = new Map<string, ContractMetricRow>();
  const byDispatcherMap = new Map<string, ContractMetricRow>();
  const byTutorMap = new Map<string, ContractMetricRow>();
  const monthTotals: Record<string, number> = blank();
  let grandTotal = 0;

  for (const c of contracts) {
    if (!c.paidAt) continue;
    const profit = contractCommission(c);
    const mk = monthFromIso(c.paidAt);
    const monthKey = `${mk.year}-${String(mk.month).padStart(2, '0')}`;
    if (!monthKeys.includes(monthKey)) continue;
    monthTotals[monthKey] += profit;
    grandTotal += profit;

    if (c.subjectId) {
      const e =
        bySubjectMap.get(c.subjectId) ??
        ({
          key: c.subjectId,
          name: subjectName.get(c.subjectId) ?? c.subjectName ?? '—',
          byMonth: blank(),
          total: 0,
        } satisfies ContractMetricRow);
      e.byMonth[monthKey] += profit;
      e.total += profit;
      bySubjectMap.set(c.subjectId, e);
    }
    if (c.dispatcherId) {
      const e =
        byDispatcherMap.get(c.dispatcherId) ??
        ({
          key: c.dispatcherId,
          name: dispatcherName.get(c.dispatcherId) ?? c.dispatcherId,
          byMonth: blank(),
          total: 0,
        } satisfies ContractMetricRow);
      e.byMonth[monthKey] += profit;
      e.total += profit;
      byDispatcherMap.set(c.dispatcherId, e);
    }
    {
      const key = c.tutorId;
      const e =
        byTutorMap.get(key) ??
        ({
          key,
          name: c.tutorName,
          byMonth: blank(),
          total: 0,
        } satisfies ContractMetricRow);
      e.byMonth[monthKey] += profit;
      e.total += profit;
      byTutorMap.set(key, e);
    }
  }

  const sortByTotal = (a: ContractMetricRow, b: ContractMetricRow) => b.total - a.total;
  return {
    bySubject: [...bySubjectMap.values()].sort(sortByTotal),
    byDispatcher: [...byDispatcherMap.values()].sort(sortByTotal),
    byTutor: [...byTutorMap.values()].sort(sortByTotal),
    monthTotals,
    grandTotal,
  };
}

// =====================================================================
// 4. РЕНТАБЕЛЬНОСТЬ КОНТРАКТНЫХ — контракт vs обычные
// =====================================================================

export interface ProfitabilityRow {
  tutorId: string;
  tutorName: string;
  subjectName: string | null;
  trials45plus: number;
  successful: number;
  refused: number;
  successRate: number; // 0..100
  students: number;
  avgRetentionDays: number;
  freq1Pct: number;
  freq2Pct: number;
  freq3Pct: number;
  avgRequestPrice: number;
  expectedRegularIncome: number;
  actualContractIncome: number;
  delta: number;
  efficiency: number; // %
}

export interface ProfitabilityResult {
  rows: ProfitabilityRow[];
  total: {
    trials45plus: number;
    successful: number;
    refused: number;
    students: number;
    expectedRegularIncome: number;
    actualContractIncome: number;
    delta: number;
    efficiency: number;
  };
  cutoffDate: string; // ISO yyyy-mm-dd
}

export function computeProfitability(args: {
  contracts: ContractRow[];
  trials: TrialRow[];
  regularPricing: RegularPricing;
  regularPricingBySubject: Record<string, RegularPricing>;
  cutoffDays: number;
  now?: Date;
}): ProfitabilityResult {
  const {
    contracts,
    trials,
    regularPricing,
    regularPricingBySubject,
    cutoffDays,
    now = new Date(),
  } = args;
  const cutoff = new Date(now.getTime() - cutoffDays * 86_400_000);

  const lookupRegular = (subjectId: string | null): RegularPricing => {
    if (subjectId && regularPricingBySubject[subjectId]) return regularPricingBySubject[subjectId];
    return regularPricing;
  };

  const priceByFreq = (pr: RegularPricing, freq: number | null): number => {
    if (!freq || freq <= 0) return 0;
    if (freq === 1) return pr.onePerWeek;
    if (freq === 2) return pr.twoPerWeek;
    return pr.threePerWeek; // 3 и более — по тарифу 3р
  };

  // Группировка по репетиторам
  const tutorIds = new Set<string>();
  for (const c of contracts) tutorIds.add(c.tutorId);
  for (const t of trials) tutorIds.add(t.tutorId);

  const trialsByTutor = new Map<string, TrialRow[]>();
  for (const t of trials) {
    const arr = trialsByTutor.get(t.tutorId) ?? [];
    arr.push(t);
    trialsByTutor.set(t.tutorId, arr);
  }

  const contractsByTutor = new Map<string, ContractRow[]>();
  for (const c of contracts) {
    const arr = contractsByTutor.get(c.tutorId) ?? [];
    arr.push(c);
    contractsByTutor.set(c.tutorId, arr);
  }

  const rows: ProfitabilityRow[] = [];
  const totals = {
    trials45plus: 0,
    successful: 0,
    refused: 0,
    students: 0,
    expectedRegularIncome: 0,
    actualContractIncome: 0,
  };

  for (const tutorId of tutorIds) {
    const tutorContracts = (contractsByTutor.get(tutorId) ?? []).filter(
      (c) => new Date(c.startedAt) <= cutoff, // отбрасываем «свежих» (младше cutoff)
    );
    const tutorTrials = (trialsByTutor.get(tutorId) ?? []).filter(
      (t) => new Date(t.scheduledAt) <= cutoff,
    );

    if (tutorContracts.length === 0 && tutorTrials.length === 0) continue;

    const successful = tutorTrials.filter((t) => t.result === 'success').length;
    const refused = tutorTrials.filter((t) => t.result === 'fail').length;
    const trials45plus = tutorTrials.length;

    // Длительность удержания: для closed_won/closed_lost — closedAt-startedAt;
    // для активных — now-startedAt
    const retentionDays = tutorContracts.map((c) => {
      const start = new Date(c.startedAt);
      const end = c.closedAt ? new Date(c.closedAt) : now;
      return daysBetween(end, start);
    });
    const avgRetentionDays =
      retentionDays.length > 0
        ? Math.round(retentionDays.reduce((s, d) => s + d, 0) / retentionDays.length)
        : 0;

    // Частоты 1/2/3р в неделю
    const freqCounts = { 1: 0, 2: 0, 3: 0 };
    for (const c of tutorContracts) {
      const f = c.lessonsPerWeek ?? 0;
      const bucket = f >= 3 ? 3 : f === 2 ? 2 : f === 1 ? 1 : null;
      if (bucket !== null) freqCounts[bucket] += 1;
    }
    const totalFreq = freqCounts[1] + freqCounts[2] + freqCounts[3];
    const pct = (n: number) => (totalFreq > 0 ? Math.round((n / totalFreq) * 100) : 0);

    // Средняя цена заявки
    const prices = tutorContracts.map((c) => parsePrice(c.requestPrice)).filter((n) => n > 0);
    const avgRequestPrice =
      prices.length > 0 ? Math.round(prices.reduce((s, n) => s + n, 0) / prices.length) : 0;

    // Ожидаемый «обычный» доход — по каждому контракту: цена-частоты по subject
    let expectedRegularIncome = 0;
    for (const c of tutorContracts) {
      const pr = lookupRegular(c.subjectId);
      expectedRegularIncome += priceByFreq(pr, c.lessonsPerWeek);
    }

    // Фактический контрактный доход = сумма контракт-комиссий
    const actualContractIncome = tutorContracts.reduce((s, c) => s + contractCommission(c), 0);

    const delta = actualContractIncome - expectedRegularIncome;
    const efficiency =
      expectedRegularIncome > 0
        ? Math.round((actualContractIncome / expectedRegularIncome) * 100)
        : 0;

    const subjectName = tutorContracts[0]?.subjectName ?? null;

    rows.push({
      tutorId,
      tutorName: tutorContracts[0]?.tutorName ?? tutorId,
      subjectName,
      trials45plus,
      successful,
      refused,
      successRate: trials45plus > 0 ? Math.round((successful / trials45plus) * 100) : 0,
      students: tutorContracts.length,
      avgRetentionDays,
      freq1Pct: pct(freqCounts[1]),
      freq2Pct: pct(freqCounts[2]),
      freq3Pct: pct(freqCounts[3]),
      avgRequestPrice,
      expectedRegularIncome,
      actualContractIncome,
      delta,
      efficiency,
    });

    totals.trials45plus += trials45plus;
    totals.successful += successful;
    totals.refused += refused;
    totals.students += tutorContracts.length;
    totals.expectedRegularIncome += expectedRegularIncome;
    totals.actualContractIncome += actualContractIncome;
  }

  rows.sort((a, b) => b.actualContractIncome - a.actualContractIncome);

  const totalDelta = totals.actualContractIncome - totals.expectedRegularIncome;
  const totalEfficiency =
    totals.expectedRegularIncome > 0
      ? Math.round((totals.actualContractIncome / totals.expectedRegularIncome) * 100)
      : 0;

  return {
    rows,
    total: { ...totals, delta: totalDelta, efficiency: totalEfficiency },
    cutoffDate: cutoff.toISOString().slice(0, 10),
  };
}

// =====================================================================
// 5. УДЕРЖАНИЕ КЛИЕНТОВ
// =====================================================================

export interface RetentionRow {
  monthKey: string;
  monthLabel: string;
  subjectId: string;
  subjectName: string;
  trials: number;
  successful: number;
  successRate: number;
  droppedThis: number;
  droppedThisPct: number; // % от successful этого месяца
  droppedLast: number;
  droppedPrev: number;
  dropped3Plus: number;
  totalDropped: number;
}

export function computeRetention(args: {
  contracts: ContractRow[];
  trials: TrialRow[];
  requests: RequestRow[];
  subjects: SubjectRow[];
  months: MonthKey[]; // которые показываем (упорядочены)
}): RetentionRow[] {
  const { contracts, trials, requests, subjects, months } = args;
  const requestById = new Map(requests.map((r) => [r.id, r]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const out: RetentionRow[] = [];

  for (const m of months) {
    const monthKey = `${m.year}-${String(m.month).padStart(2, '0')}`;

    // Группируем пробные этого месяца по предмету
    const trialsByMonth = trials.filter((t) => inMonth(t.scheduledAt, m));
    // Контракты, начавшиеся в этот месяц — для подсчёта успешных по предмету
    const contractsStartedInMonth = contracts.filter((c) => inMonth(c.startedAt, m));
    // Контракты, отпавшие (closed_lost) в этом месяце
    const contractsDroppedInMonth = contracts.filter(
      (c) => c.status === 'closed_lost' && c.closedAt && inMonth(c.closedAt, m),
    );

    // Собираем пары (subjectId × month)
    const subjectIds = new Set<string>();
    for (const t of trialsByMonth) {
      const r = requestById.get(t.requestId);
      if (r?.subjectId) subjectIds.add(r.subjectId);
    }
    for (const c of contractsStartedInMonth) if (c.subjectId) subjectIds.add(c.subjectId);
    for (const c of contractsDroppedInMonth) if (c.subjectId) subjectIds.add(c.subjectId);

    for (const subjectId of subjectIds) {
      const subjTrials = trialsByMonth.filter((t) => {
        const r = requestById.get(t.requestId);
        return r?.subjectId === subjectId;
      });
      const trialsCount = subjTrials.length;
      const successfulCount = subjTrials.filter((t) => t.result === 'success').length;

      const droppedThis = contractsDroppedInMonth.filter(
        (c) => c.subjectId === subjectId && inMonth(c.startedAt, m),
      ).length;
      const droppedLast = contractsDroppedInMonth.filter((c) => {
        if (c.subjectId !== subjectId) return false;
        const startMonth = monthFromIso(c.startedAt);
        return monthsDiff(m, startMonth) === 1;
      }).length;
      const droppedPrev = contractsDroppedInMonth.filter((c) => {
        if (c.subjectId !== subjectId) return false;
        const startMonth = monthFromIso(c.startedAt);
        return monthsDiff(m, startMonth) === 2;
      }).length;
      const dropped3Plus = contractsDroppedInMonth.filter((c) => {
        if (c.subjectId !== subjectId) return false;
        const startMonth = monthFromIso(c.startedAt);
        return monthsDiff(m, startMonth) >= 3;
      }).length;
      const totalDropped = droppedThis + droppedLast + droppedPrev + dropped3Plus;

      out.push({
        monthKey,
        monthLabel: `${m.year}-${String(m.month).padStart(2, '0')}`,
        subjectId,
        subjectName: subjectById.get(subjectId)?.name ?? subjectId,
        trials: trialsCount,
        successful: successfulCount,
        successRate: trialsCount > 0 ? Math.round((successfulCount / trialsCount) * 100) : 0,
        droppedThis,
        droppedThisPct: successfulCount > 0 ? Math.round((droppedThis / successfulCount) * 100) : 0,
        droppedLast,
        droppedPrev,
        dropped3Plus,
        totalDropped,
      });
    }
  }

  return out.sort(
    (a, b) => b.monthKey.localeCompare(a.monthKey) || a.subjectName.localeCompare(b.subjectName),
  );
}

// =====================================================================
// 6. МЕТРИКИ ВЗАИМОДЕЙСТВИЯ ДИСПЕТЧЕРА + SLA
// =====================================================================

export interface DispatcherStatRow {
  dispatcherId: string;
  name: string;
  totalLeads: number;
  totalRequests: number;
  byStage: Record<string, number>;
  rejections: { reasonId: string; label: string; count: number }[];
  totalRefusals: number;
  totalSuccess: number;
  successRate: number;
  avgFirstResponseMin: number; // SLA: ответ на новый диалог
  avgTutorSearchHours: number; // SLA: время поиска репа
}

export function computeDispatcherStats(args: {
  dispatchers: DispatcherRow[];
  leads: LeadRow[];
  requests: RequestRow[];
  dialogs: DialogRow[];
  rejectionReasons: RejectionReasonRow[];
  fromIso: string;
  toIso: string;
}): DispatcherStatRow[] {
  const { dispatchers, leads, requests, dialogs, rejectionReasons, fromIso, toIso } = args;
  const reasonLabel = new Map(rejectionReasons.map((r) => [r.id, r.label]));
  const fromTs = new Date(fromIso).getTime();
  const toTs = new Date(toIso).getTime();

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= fromTs && t <= toTs;
  };

  return dispatchers.map<DispatcherStatRow>((d) => {
    const myLeads = leads.filter((l) => l.dispatcherId === d.id && inRange(l.createdAt));
    const myRequests = requests.filter((r) => r.dispatcherId === d.id && inRange(r.createdAt));
    const myDialogs = dialogs.filter((g) => g.dispatcherId === d.id && inRange(g.createdAt));

    const byStage: Record<string, number> = {};
    for (const r of myRequests) byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;

    const refusals = myRequests.filter((r) => r.stage === 'closed_lost');
    const success = myRequests.filter((r) => r.stage === 'closed_won');

    const refMap = new Map<string, { reasonId: string; label: string; count: number }>();
    for (const r of refusals) {
      if (!r.rejectionReasonId) continue;
      const e = refMap.get(r.rejectionReasonId) ?? {
        reasonId: r.rejectionReasonId,
        label: reasonLabel.get(r.rejectionReasonId) ?? r.rejectionReasonId,
        count: 0,
      };
      e.count += 1;
      refMap.set(r.rejectionReasonId, e);
    }

    // Аппроксимация SLA первого ответа: updatedAt - createdAt по каждому диалогу.
    // У реального бэка будет точная метка first-response; для моков — приблизительно.
    const responseDeltas = myDialogs
      .map((g) => new Date(g.updatedAt).getTime() - new Date(g.createdAt).getTime())
      .filter((d) => d > 0);
    const avgFirstResponseMin =
      responseDeltas.length > 0
        ? Math.round(responseDeltas.reduce((s, n) => s + n, 0) / responseDeltas.length / 60_000)
        : 0;

    // SLA поиска репетитора: для заявок с assignedTutorId — updatedAt - createdAt.
    const searchDeltas = myRequests
      .filter((r) => r.assignedTutorId)
      .map((r) => new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime())
      .filter((d) => d > 0);
    const avgTutorSearchHours =
      searchDeltas.length > 0
        ? Math.round(searchDeltas.reduce((s, n) => s + n, 0) / searchDeltas.length / 3_600_000)
        : 0;

    const totalRefusals = refusals.length;
    const totalSuccess = success.length;
    const totalTerminal = totalRefusals + totalSuccess;

    return {
      dispatcherId: d.id,
      name: d.name,
      totalLeads: myLeads.length,
      totalRequests: myRequests.length,
      byStage,
      rejections: [...refMap.values()].sort((a, b) => b.count - a.count),
      totalRefusals,
      totalSuccess,
      successRate: totalTerminal > 0 ? Math.round((totalSuccess / totalTerminal) * 100) : 0,
      avgFirstResponseMin,
      avgTutorSearchHours,
    };
  });
}
