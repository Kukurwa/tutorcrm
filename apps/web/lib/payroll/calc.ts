import type {
  PayrollConfig,
  PayrollDispatcherCell,
  PayrollRange,
  PayrollRopRow,
  TenureBucket,
} from '@tutorcrm/contracts';
import { TENURE_BUCKETS } from '@tutorcrm/contracts';

type ContractRow = {
  dispatcherId: string | null;
  amountReceived: number | null;
  commissionRate: number;
  paidAt: string | null;
};
type OneTimePaymentRow = {
  requestId: string;
  amount: number;
  status: string;
  paidAt: string | null;
};
type RequestRow = { id: string; dispatcherId: string | null };
type DispatcherRow = { id: string; name: string; hireDate: string | null };

export interface MonthKey {
  year: number;
  month: number; // 1..12
}

export function parseMonthKey(value: string): MonthKey {
  const [y, m] = value.split('-').map(Number);
  return { year: y ?? 1970, month: m ?? 1 };
}

export function formatMonthKey({ year, month }: MonthKey): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function currentMonthKey(now: Date = new Date()): MonthKey {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function inMonth(iso: string | null, key: MonthKey): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === key.year && d.getMonth() + 1 === key.month;
}

/**
 * Оборот диспетчера за месяц = сумма комиссий по контрактам, оплаченным в месяце
 *                            + сумма разовых оплат (paid в месяце).
 * См. PDF «Правки-2»: «сумма заявок + сумма контракт комиссий (оборот) за месяц».
 */
export interface DispatcherTurnover {
  dispatcherId: string;
  contractCommissions: number;
  oneTimeRevenue: number;
  total: number;
}

export function computeDispatcherTurnovers(args: {
  dispatchers: DispatcherRow[];
  contracts: ContractRow[];
  oneTimePayments: OneTimePaymentRow[];
  requests: RequestRow[];
  month: MonthKey;
}): DispatcherTurnover[] {
  const { dispatchers, contracts, oneTimePayments, requests, month } = args;
  const requestById = new Map(requests.map((r) => [r.id, r]));

  return dispatchers.map((d) => {
    const contractCommissions = contracts
      .filter((c) => c.dispatcherId === d.id && inMonth(c.paidAt, month))
      .reduce((sum, c) => sum + Math.round((c.amountReceived ?? 0) * c.commissionRate), 0);

    const oneTimeRevenue = oneTimePayments
      .filter((p) => p.status === 'paid' && inMonth(p.paidAt, month))
      .filter((p) => requestById.get(p.requestId)?.dispatcherId === d.id)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      dispatcherId: d.id,
      contractCommissions,
      oneTimeRevenue,
      total: contractCommissions + oneTimeRevenue,
    };
  });
}

function rangeContains(range: PayrollRange, value: number): boolean {
  if (value < range.from) return false;
  if (range.to === null) return true;
  return value <= range.to;
}

export function findRangeIndex(ranges: PayrollRange[], value: number): number {
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r && rangeContains(r, value)) return i;
  }
  return ranges.length - 1;
}

/**
 * Стаж в полных месяцах от даты найма до now.
 */
export function tenureMonths(hireDate: string | null, now: Date = new Date()): number {
  if (!hireDate) return 0;
  const [y, m, d] = hireDate.split('-').map(Number);
  const hire = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
  // если день месяца ещё не наступил — считается неполный месяц
  return now.getDate() < hire.getDate() ? months - 1 : months;
}

export function tenureBucket(months: number): TenureBucket {
  if (months < 6) return 'lt6';
  if (months < 12) return 'gte6';
  if (months < 36) return 'gte12';
  if (months < 48) return 'gte36';
  return 'gte48';
}

export interface DispatcherSalary {
  dispatcherId: string;
  turnover: number;
  rangeIndex: number;
  tenureMonths: number;
  tenureBucket: TenureBucket;
  cell: PayrollDispatcherCell;
  percentPart: number;
  fixedPart: number;
  total: number;
}

export function computeDispatcherSalary(args: {
  config: PayrollConfig;
  turnover: number;
  hireDate: string | null;
  now?: Date;
}): DispatcherSalary {
  const { config, turnover, hireDate, now = new Date() } = args;
  const rangeIndex = findRangeIndex(config.dispatcherRanges, turnover);
  const months = tenureMonths(hireDate, now);
  const bucket = tenureBucket(months);
  const tenureIndex = TENURE_BUCKETS.indexOf(bucket);
  const matrixRow = config.dispatcherMatrix[rangeIndex];
  const cell = matrixRow?.[tenureIndex] ?? { percent: 0, fixed: 0 };
  const percentPart = turnover > 0 ? Math.round((turnover * cell.percent) / 100) : 0;
  const fixedPart = turnover > 0 ? cell.fixed : 0;
  return {
    dispatcherId: '',
    turnover,
    rangeIndex,
    tenureMonths: months,
    tenureBucket: bucket,
    cell,
    percentPart,
    fixedPart,
    total: percentPart + fixedPart,
  };
}

export interface RopRowResult {
  dispatcherId: string;
  turnover: number;
  rangeIndex: number;
  row: PayrollRopRow;
  percentPart: number;
  fixedPart: number;
  total: number;
}

export function computeRopBreakdown(args: {
  config: PayrollConfig;
  turnovers: DispatcherTurnover[];
}): { rows: RopRowResult[]; total: number } {
  const { config, turnovers } = args;
  const fallbackRow: PayrollRopRow = { from: 0, to: null, percent: 0, fixed: 0 };
  const rows = turnovers.map<RopRowResult>((t) => {
    const rangeIndex = findRangeIndex(config.ropScale, t.total);
    const row = config.ropScale[rangeIndex] ?? fallbackRow;
    const percentPart = t.total > 0 ? Math.round((t.total * row.percent) / 100) : 0;
    const fixedPart = t.total > 0 ? row.fixed : 0;
    return {
      dispatcherId: t.dispatcherId,
      turnover: t.total,
      rangeIndex,
      row,
      percentPart,
      fixedPart,
      total: percentPart + fixedPart,
    };
  });
  return { rows, total: rows.reduce((sum, r) => sum + r.total, 0) };
}

export function formatRange(range: PayrollRange): string {
  const fmt = (n: number) => n.toLocaleString('ru-RU');
  if (range.to === null) return `${fmt(range.from)} +`;
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}
