'use client';

import { useEffect, useState } from 'react';

import { cn } from '@tutorcrm/ui';

export interface NumInputProps {
  value: number;
  onChange: (next: number) => void;
  /** Знаков после запятой при отображении в blur. Default 0 (тысячи через пробел). */
  decimals?: number;
  /** Подпись справа внутри поля (грн / % и т.п.). */
  suffix?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
}

const ru = (n: number, decimals: number) =>
  n.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const parse = (s: string): number | null => {
  const cleaned = s.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/**
 * Числовое поле без HTML-спиннеров, с тысячными разделителями при потере фокуса,
 * выравниванием по правому краю и опциональным suffix внутри поля.
 *
 * Стилизация — shadcn (border-input, ring-ring) + tabular-nums.
 */
export function NumInput({
  value,
  onChange,
  decimals = 0,
  suffix,
  className,
  min,
  max,
  step,
  ariaLabel,
}: NumInputProps) {
  const [draft, setDraft] = useState<string>(ru(value, decimals));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(ru(value, decimals));
  }, [value, decimals, focused]);

  const clamp = (n: number) => {
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };

  return (
    <div className="relative inline-flex w-full">
      <input
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        aria-label={ariaLabel}
        value={draft}
        onFocus={(e) => {
          setFocused(true);
          // в фокусе показываем «сырое» число без разделителей — удобнее редактировать
          setDraft(value === 0 ? '' : String(value));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parse(e.target.value);
          if (n !== null) onChange(clamp(n));
        }}
        onBlur={() => {
          setFocused(false);
          const n = parse(draft);
          const next = clamp(n ?? 0);
          onChange(next);
          setDraft(ru(next, decimals));
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const cur = parse(draft) ?? value;
            const delta = (step ?? (decimals > 0 ? 0.1 : 1)) * (e.key === 'ArrowUp' ? 1 : -1);
            const next = clamp(cur + delta);
            onChange(next);
            setDraft(focused ? String(next) : ru(next, decimals));
          }
        }}
        className={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:ring-ring',
          'h-8 w-full rounded-md border px-2 text-right text-sm tabular-nums',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          suffix && 'pr-7',
          className,
        )}
      />
      {suffix ? (
        <span className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
