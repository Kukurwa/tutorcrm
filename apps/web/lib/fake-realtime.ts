'use client';

import { useEffect, useRef } from 'react';

export type RealtimeHandler = () => void;

const listeners = new Set<RealtimeHandler>();

export function emitFakeRealtime(): void {
  for (const fn of listeners) fn();
}

export function onFakeRealtime(fn: RealtimeHandler): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFakeRealtimePoll(
  handler: RealtimeHandler,
  options: { intervalMs?: number } = {},
): void {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const off = onFakeRealtime(() => savedHandler.current());
    const id = window.setInterval(
      () => savedHandler.current(),
      options.intervalMs ?? 20_000,
    );
    return () => {
      off();
      window.clearInterval(id);
    };
  }, [options.intervalMs]);
}
