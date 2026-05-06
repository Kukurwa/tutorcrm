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
  Badge,
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
  dispatchers: { id: string; name: string }[];
  canFilterByDispatcher: boolean;
}

function toRequestStages(stages: FunnelStage[]): RequestStage[] {
  return stages.filter((s): s is RequestStage => s.kind !== 'new_dialog');
}

interface PendingMove {
  request: Req;
  to: RequestStageKind;
  stage: RequestStage;
}

export function FunnelBoard({
  initial,
  stages: rawStages,
  reasons,
  tutors,
  dispatchers,
  canFilterByDispatcher,
}: Props) {
  const stages = useMemo(() => toRequestStages(rawStages), [rawStages]);
  const [rows, setRows] = useState<Req[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<RequestStageKind | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [filterDispatcher, setFilterDispatcher] = useState<string>('');

  const filteredRows = useMemo(() => {
    if (!canFilterByDispatcher || !filterDispatcher) return rows;
    return rows.filter((r) => r.dispatcherId === filterDispatcher);
  }, [rows, filterDispatcher, canFilterByDispatcher]);

  const byStage = useMemo(() => {
    const map = new Map<RequestStageKind, Req[]>();
    for (const s of stages) map.set(s.kind, []);
    for (const r of filteredRows) {
      const arr = map.get(r.stage);
      if (arr) arr.push(r);
    }
    return map;
  }, [filteredRows, stages]);

  async function move(
    request: Req,
    to: RequestStageKind,
    extras: { tutorId?: string; rejectionReasonId?: string } = {},
  ) {
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
      toast.error('Переход запрещён правилами воронки');
      return;
    }
    if (requiresRejectionReason(stage.kind) || requiresTutor(stage.kind)) {
      setPending({ request: req, to: stage.kind, stage });
      return;
    }
    void move(req, stage.kind);
  }

  return (
    <div className="space-y-3">
      {canFilterByDispatcher ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Диспетчер:</span>
          <Select
            value={filterDispatcher === '' ? '__all' : filterDispatcher}
            onValueChange={(v) => setFilterDispatcher(v === '__all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Все диспетчеры</SelectItem>
              {dispatchers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((s) => {
          const items = byStage.get(s.kind) ?? [];
          const isDropTarget =
            dragId && canTransition(rows.find((r) => r.id === dragId)?.stage ?? s.kind, s.kind);
          return (
            <div
              key={s.id}
              className={cn(
                'bg-card flex min-h-[480px] w-72 shrink-0 flex-col overflow-hidden rounded-lg border',
                hoverStage === s.kind && 'ring-primary ring-2',
                !isDropTarget &&
                  dragId &&
                  dragId !== rows.find((r) => r.stage === s.kind)?.id &&
                  'opacity-60',
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
              {/* Верхняя цветная полоса в цвете стадии */}
              <div className="h-1" style={{ backgroundColor: s.color }} aria-hidden />
              <div className="flex items-center justify-between border-b p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <h3 className="text-sm font-medium">{s.name}</h3>
                  <span className="bg-muted rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {items.length}
                  </span>
                </div>
                {s.slaMinutes ? (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    SLA {s.slaMinutes}м
                  </Badge>
                ) : null}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {items.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-xs">Нет заявок</p>
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
                      className="bg-background cursor-grab rounded-md border p-2 text-sm shadow-sm active:cursor-grabbing"
                    >
                      <div className="font-medium">{r.clientName}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.subjectName ?? 'без предмета'} ·{' '}
                        {r.dealType === 'contract' ? 'контракт' : 'разовый'}
                      </div>
                      {r.pricePerHour || r.requestPrice ? (
                        <div className="text-muted-foreground mt-1 font-mono text-xs">
                          {r.pricePerHour ?? '—'} / {r.requestPrice ?? '—'}
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
          <DialogDescription>Для перевода необходимы дополнительные данные.</DialogDescription>
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
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
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
