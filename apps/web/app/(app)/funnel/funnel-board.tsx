'use client';

import { useMemo, useState } from 'react';

import type {
  FunnelStage,
  RejectionReason,
  Request as Req,
  RequestStageKind,
  Tutor,
} from '@tutorcrm/contracts';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { canTransition, requiresRejectionReason, requiresTutor } from '@/lib/funnel/state-machine';

type RequestStage = FunnelStage & { kind: RequestStageKind };

interface Props {
  initial: Req[];
  stages: FunnelStage[];
  reasons: RejectionReason[];
  tutors: Tutor[];
}

function toRequestStages(stages: FunnelStage[]): RequestStage[] {
  return stages.filter(
    (s): s is RequestStage => s.kind !== 'new_dialog',
  );
}

interface PendingMove {
  request: Req;
  to: RequestStageKind;
  stage: RequestStage;
}

export function FunnelBoard({ initial, stages: rawStages, reasons, tutors }: Props) {
  const stages = useMemo(() => toRequestStages(rawStages), [rawStages]);
  const [rows, setRows] = useState<Req[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<RequestStageKind | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<RequestStageKind, Req[]>();
    for (const s of stages) map.set(s.kind, []);
    for (const r of rows) {
      const arr = map.get(r.stage);
      if (arr) arr.push(r);
    }
    return map;
  }, [rows, stages]);

  async function move(request: Req, to: RequestStageKind, extras: { tutorId?: string; rejectionReasonId?: string } = {}) {
    const optimistic = { ...request, stage: to };
    setRows((p) => p.map((r) => (r.id === request.id ? optimistic : r)));
    try {
      const res = await api.post<{ request: Req }>(`/api/requests/${request.id}/transition`, {
        to,
        ...extras,
      });
      setRows((p) => p.map((r) => (r.id === request.id ? res.request : r)));
      toast.success('Перемещено');
    } catch (err) {
      setRows((p) => p.map((r) => (r.id === request.id ? request : r)));
      if (err instanceof ApiClientError && err.status === 409) {
        toast.error(`Переход запрещён: ${err.message}`);
      } else {
        toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
      }
    }
  }

  function onDrop(stage: RequestStage) {
    setHoverStage(null);
    if (!dragId) return;
    const req = rows.find((r) => r.id === dragId);
    if (!req) return;
    setDragId(null);
    if (req.stage === stage.kind) return;
    if (!canTransition(req.stage, stage.kind)) {
      toast.error('Переход запрещён state machine');
      return;
    }
    if (requiresRejectionReason(stage.kind) || requiresTutor(stage.kind)) {
      setPending({ request: req, to: stage.kind, stage });
      return;
    }
    void move(req, stage.kind);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((s) => {
        const items = byStage.get(s.kind) ?? [];
        const isDropTarget = dragId && canTransition(
          rows.find((r) => r.id === dragId)?.stage ?? s.kind,
          s.kind,
        );
        return (
          <div
            key={s.id}
            className={cn(
              'flex min-h-[480px] w-72 shrink-0 flex-col rounded-lg border bg-card',
              hoverStage === s.kind && 'ring-2 ring-primary',
              !isDropTarget && dragId && dragId !== rows.find((r) => r.stage === s.kind)?.id && 'opacity-60',
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setHoverStage(s.kind);
            }}
            onDragLeave={() => setHoverStage((h) => (h === s.kind ? null : h))}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(s);
            }}
          >
            <div
              className="flex items-center justify-between border-b p-3"
              style={{ borderBottomColor: s.color + '55' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <h3 className="text-sm font-medium">{s.name}</h3>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {items.length}
                </span>
              </div>
              {s.slaMinutes ? (
                <StatusBadge
                  tone="neutral"
                  label={`SLA ${s.slaMinutes}м`}
                  className="text-[10px]"
                />
              ) : null}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Нет заявок
                </p>
              ) : (
                items.map((r) => (
                  <article
                    key={r.id}
                    draggable
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setHoverStage(null);
                    }}
                    className="cursor-grab rounded-md border bg-background p-2 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <div className="font-medium">{r.clientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.subjectName ?? 'без предмета'} ·{' '}
                      {r.dealType === 'contract' ? 'контракт' : 'разовый'}
                    </div>
                    {r.budgetFrom || r.budgetTo ? (
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {r.budgetFrom ?? '—'}–{r.budgetTo ?? '—'}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        );
      })}

      <PendingDialog
        pending={pending}
        reasons={reasons}
        tutors={tutors}
        onCancel={() => setPending(null)}
        onConfirm={(extras) => {
          if (!pending) return;
          void move(pending.request, pending.to, extras);
          setPending(null);
        }}
      />
    </div>
  );
}

function PendingDialog({
  pending,
  reasons,
  tutors,
  onCancel,
  onConfirm,
}: {
  pending: PendingMove | null;
  reasons: RejectionReason[];
  tutors: Tutor[];
  onCancel: () => void;
  onConfirm: (extras: { tutorId?: string; rejectionReasonId?: string }) => void;
}) {
  const [reasonId, setReasonId] = useState<string>(reasons[0]?.id ?? '');
  const [tutorId, setTutorId] = useState<string>(tutors[0]?.id ?? '');

  if (!pending) return null;
  const needReason = requiresRejectionReason(pending.to);
  const needTutor = requiresTutor(pending.to);

  return (
    <Dialog open={pending !== null} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перевести в «{pending.stage.name}»</DialogTitle>
          <DialogDescription>
            Для перевода необходимы дополнительные данные.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {needReason ? (
            <FormField label="Причина отказа" required>
              <Select value={reasonId} onValueChange={setReasonId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
          {needTutor ? (
            <FormField label="Репетитор" required>
              <Select value={tutorId} onValueChange={setTutorId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Отмена</Button>
          <Button
            onClick={() =>
              onConfirm({
                tutorId: needTutor ? tutorId : undefined,
                rejectionReasonId: needReason ? reasonId : undefined,
              })
            }
          >
            Перевести
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
