import type { Contract, Subject } from '@tutorcrm/contracts';

/**
 * Генератор кода заказа.
 * - Для regular: `<code>-<n>` (А-1, М-5).
 * - Для contract: `<contractCode>-<tutorIdx>.<clientIdx>` (НДК-1.1).
 *
 * Нумерация — по существующим контрактам внутри одного предмета:
 * regular — последовательность 1, 2, 3…
 * contract — для нового репетитора инкрементируем tutorIdx,
 * для существующего — clientIdx.
 */
export function buildOrderCode(opts: {
  subject: Subject | null;
  tutorId: string;
  isContract: boolean; // true = контрактный репетитор
  existing: Contract[];
}): string | null {
  if (!opts.subject) return null;
  const inSubject = opts.existing.filter((c) => c.subjectId === opts.subject!.id);

  if (!opts.isContract) {
    const code = opts.subject.code;
    const next = inSubject.length + 1;
    return `${code}-${next}`;
  }

  const prefix = opts.subject.contractCode ?? opts.subject.code;
  const tutorMap = new Map<string, Contract[]>();
  for (const c of inSubject) {
    if (!c.code || !c.code.startsWith(`${prefix}-`)) continue;
    const list = tutorMap.get(c.tutorId) ?? [];
    list.push(c);
    tutorMap.set(c.tutorId, list);
  }
  const tutorIds = Array.from(tutorMap.keys());
  let tutorIdx: number;
  let clientIdx: number;
  if (tutorMap.has(opts.tutorId)) {
    tutorIdx = tutorIds.indexOf(opts.tutorId) + 1;
    clientIdx = (tutorMap.get(opts.tutorId)?.length ?? 0) + 1;
  } else {
    tutorIdx = tutorIds.length + 1;
    clientIdx = 1;
  }
  return `${prefix}-${tutorIdx}.${clientIdx}`;
}
