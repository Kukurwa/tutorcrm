// Простой хеш строки → одна из палитры из 8 базовых тонов.
// Используется для AvatarFallback и иконок репетиторов/клиентов.
const PALETTE = [
  { bg: 'bg-rose-100', fg: 'text-rose-700' },
  { bg: 'bg-amber-100', fg: 'text-amber-700' },
  { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  { bg: 'bg-sky-100', fg: 'text-sky-700' },
  { bg: 'bg-indigo-100', fg: 'text-indigo-700' },
  { bg: 'bg-violet-100', fg: 'text-violet-700' },
  { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-700' },
  { bg: 'bg-teal-100', fg: 'text-teal-700' },
] as const;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getAvatarColor(name: string): { bg: string; fg: string } {
  if (!name) return PALETTE[0];
  const idx = hash(name) % PALETTE.length;
  return PALETTE[idx] ?? PALETTE[0];
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
