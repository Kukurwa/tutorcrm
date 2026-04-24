const MONTHS_RU = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин`;

  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  if (sameDay) return `${pad(then.getHours())}:${pad(then.getMinutes())}`;

  return `${pad(then.getDate())} ${MONTHS_RU[then.getMonth()]}`;
}

export function formatFull(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CURRENCY_SYMBOLS: Record<'UAH' | 'USD' | 'EUR', string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
};

export function formatCurrency(amount: number, currency: 'UAH' | 'USD' | 'EUR' = 'UAH'): string {
  // Avoid Intl.NumberFormat — Node/ICU and browser differ for some currencies
  // (e.g. UAH renders as "грн." in Node but "₴" in browser), which causes
  // hydration mismatches when the value is used in server components.
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(amount)).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped} ${CURRENCY_SYMBOLS[currency]}`;
}
