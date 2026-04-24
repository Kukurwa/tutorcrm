import type { RequestStageKind } from '@tutorcrm/contracts';

export const TRANSITIONS: Record<RequestStageKind, RequestStageKind[]> = {
  lead_created: ['request_created', 'closed_lost'],
  request_created: ['published', 'searching_tutor', 'closed_lost'],
  published: ['searching_tutor', 'closed_lost'],
  searching_tutor: ['tutor_found', 'closed_lost'],
  tutor_found: ['trial_scheduled', 'searching_tutor', 'closed_lost'],
  trial_scheduled: ['trial_done', 'searching_tutor', 'closed_lost'],
  trial_done: ['active', 'closed_won', 'closed_lost'],
  active: ['closed_won', 'closed_lost'],
  closed_won: [],
  closed_lost: [],
};

export const TERMINAL_STAGES: RequestStageKind[] = ['closed_won', 'closed_lost'];

export function canTransition(from: RequestStageKind, to: RequestStageKind): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function requiresRejectionReason(to: RequestStageKind): boolean {
  return to === 'closed_lost';
}

export function requiresTutor(to: RequestStageKind): boolean {
  return to === 'tutor_found' || to === 'trial_scheduled';
}

export function validateTransition(input: {
  from: RequestStageKind;
  to: RequestStageKind;
  rejectionReasonId?: string | undefined;
  tutorId?: string | undefined;
}): { ok: true } | { ok: false; error: string } {
  if (!canTransition(input.from, input.to)) {
    return { ok: false, error: `Transition ${input.from} → ${input.to} is not allowed` };
  }
  if (requiresRejectionReason(input.to) && !input.rejectionReasonId) {
    return { ok: false, error: 'rejectionReasonId required for closing request as lost' };
  }
  if (requiresTutor(input.to) && !input.tutorId) {
    return { ok: false, error: 'tutorId required for this transition' };
  }
  return { ok: true };
}
