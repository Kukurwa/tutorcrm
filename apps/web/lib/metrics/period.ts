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

export function inMonth(iso: string | null, key: MonthKey): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === key.year && d.getMonth() + 1 === key.month;
}

const RU_MONTHS_NOM = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export function monthLabel(key: MonthKey): string {
  return `${RU_MONTHS_NOM[key.month - 1]} ${key.year}`;
}

export function previousMonth(key: MonthKey, n: number = 1): MonthKey {
  let year = key.year;
  let month = key.month - n;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return { year, month };
}

export function lastNMonths(now: Date, n: number): MonthKey[] {
  const cur = currentMonthKey(now);
  const out: MonthKey[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(previousMonth(cur, i));
  return out;
}

export function monthsDiff(later: MonthKey, earlier: MonthKey): number {
  return (later.year - earlier.year) * 12 + (later.month - earlier.month);
}

export function monthFromIso(iso: string): MonthKey {
  const d = new Date(iso);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}
