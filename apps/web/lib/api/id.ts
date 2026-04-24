let counter = 0;

export function generateId(prefix: string): string {
  counter += 1;
  const unique = `${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  return `${prefix}_${unique}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
