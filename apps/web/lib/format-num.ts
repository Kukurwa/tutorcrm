/**
 * Утилиты для форматирования чисел и сумм в UI.
 * Используют ru-RU: тысячи через пробел, дробная часть с запятой.
 */

export const fmtInt = (n: number): string => n.toLocaleString('ru-RU');

export const fmtMoney = (n: number): string => `${fmtInt(Math.round(n))} грн`;

export const fmtPercent = (n: number, decimals = 1): string =>
  `${n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: decimals })}%`;

/** Дельта со знаком и единицей. `0` → «0 грн». */
export const fmtDelta = (n: number, unit = 'грн'): string => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${fmtInt(Math.round(n))} ${unit}`;
};
