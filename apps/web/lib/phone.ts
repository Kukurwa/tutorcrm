export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D+/g, '');
  if (digits.length < 6) return null;
  return `+${digits}`;
}
