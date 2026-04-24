'use client';

import * as React from 'react';

import { cn } from '../lib/cn';

export interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, className, disabled }: ColorPickerProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-8 w-10 cursor-pointer rounded border bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        disabled={disabled}
        className="h-8 w-24 rounded border bg-background px-2 text-xs font-mono disabled:opacity-50"
        spellCheck={false}
      />
    </div>
  );
}
