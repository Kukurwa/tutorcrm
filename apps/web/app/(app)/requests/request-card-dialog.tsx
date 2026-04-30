'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  FunnelStage,
  RejectionReason,
  Request as Req,
  RequestResponse,
  RequestResponseStatus,
  RequestStageKind,
  Tutor,
} from '@tutorcrm/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { StagePill } from '@/components/stage-pill';
import { api, ApiClientError } from '@/lib/api-client';
import { formatFull } from '@/lib/format';
import { TRANSITIONS } from '@/lib/funnel/state-machine';

interface Props {
  request: Req | null;
  onClose: () => void;
  onUpdate: (r: Req) => void;
  stages: FunnelStage[];
  reasons: RejectionReason[];
  tutors: Tutor[];
}

const RESP_LABEL: Record<RequestResponseStatus, string> = {
  new: 'Новый',
  interested: 'Интересуется',
  declined: 'Отказ',
  selected: 'Выбран',
};

const RESP_TONE: Record<
  RequestResponseStatus,
  'info' | 'neutral' | 'warning' | 'success' | 'danger'
> = {
  new: 'info',
  interested: 'warning',
  declined: 'danger',
  selected: 'success',
};

export function RequestCardDialog({ request, onClose, onUpdate, stages, reasons, tutors }: Props) {
  const [responses, setResponses] = useState<RequestResponse[]>([]);
  const [addingResponse, setAddingResponse] = useState(false);

  useEffect(() => {
    if (!request) return;
    (async () => {
      try {
        const res = await api.get<{ items: RequestResponse[] }>(
          `/api/request-responses?requestId=${request.id}`,
        );
        setResponses(res.items);
      } catch {
        /* noop */
      }
    })();
  }, [request?.id, request]);

  if (!request) return null;
  const current = request;

  async function transition(
    to: RequestStageKind,
    extras: { tutorId?: string; rejectionReasonId?: string } = {},
  ) {
    try {
      const res = await api.post<{ request: Req }>(`/api/requests/${current.id}/transition`, {
        to,
        ...extras,
      });
      onUpdate(res.request);
      toast.success('Переход выполнен');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        toast.error(`Переход запрещён: ${err.message}`);
      } else {
        toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
      }
    }
  }

  async function publish(channels: string[]) {
    try {
      const res = await api.post<{ request: Req }>(`/api/requests/${current.id}/publish`, {
        channels,
      });
      onUpdate(res.request);
      toast.success('Опубликовано');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function addResponse(d: { tutorId: string; note: string | null }) {
    try {
      const res = await api.post<{ response: RequestResponse }>('/api/request-responses', {
        requestId: current.id,
        tutorId: d.tutorId,
        note: d.note,
      });
      setResponses((p) => [...p, res.response]);
      setAddingResponse(false);
      toast.success('Отклик добавлен');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function updateResponseStatus(id: string, status: RequestResponseStatus) {
    try {
      const res = await api.patch<{ response: RequestResponse }>(`/api/request-responses/${id}`, {
        status,
      });
      setResponses((p) => p.map((r) => (r.id === id ? res.response : r)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  const availableTransitions = TRANSITIONS[current.stage] ?? [];
  const currentStage = stages.find((s) => s.kind === current.stage);

  return (
    <Dialog open={current !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Заявка #{current.id.slice(-6)}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>
              {current.clientName} · {current.subjectName ?? 'без предмета'}
            </span>
            {currentStage ? (
              <StagePill name={currentStage.name} color={currentStage.color} />
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Данные</TabsTrigger>
            <TabsTrigger value="post">Пост заявки</TabsTrigger>
            <TabsTrigger value="responses">Отклики ({responses.length})</TabsTrigger>
            <TabsTrigger value="transitions">Переходы</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Имя ученика">
                <div className="text-sm">{current.studentName ?? '—'}</div>
              </FormField>
              <FormField label="Возраст">
                <div className="text-sm">{current.age ?? '—'}</div>
              </FormField>
              <FormField label="Класс">
                <div className="text-sm">{current.grade ?? '—'}</div>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Цена в час">
                <div className="text-sm">{current.pricePerHour ?? '—'}</div>
              </FormField>
              <FormField label="Цена заявки">
                <div className="text-sm">{current.requestPrice ?? '—'}</div>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Тип">
                <div className="text-sm">
                  {current.dealType === 'contract' ? 'Контрактный' : 'Разовый'}
                </div>
              </FormField>
              <FormField label="Расписание">
                <div className="text-sm">{current.schedule ?? 'не указано'}</div>
              </FormField>
            </div>
            <FormField label="Доп. информация">
              <Textarea rows={4} defaultValue={current.extraInfo ?? current.description} readOnly />
            </FormField>
            {current.republishCount > 0 ? (
              <div className="text-muted-foreground text-xs">
                Перевыставлено: {current.republishCount} раз
                {current.republishedAt ? ` · последний — ${formatFull(current.republishedAt)}` : ''}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="post">
            <PublishTab request={current} onPublish={publish} />
          </TabsContent>

          <TabsContent value="responses" className="space-y-3">
            <div className="flex justify-between">
              <div className="text-muted-foreground text-sm">
                В реальной системе отклики парсятся автоматически. Для демо — добавляйте вручную.
              </div>
              <Button size="sm" onClick={() => setAddingResponse(true)}>
                <Plus className="h-4 w-4" /> Добавить отклик
              </Button>
            </div>
            {responses.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-6 text-center text-sm">
                Откликов пока нет
              </p>
            ) : (
              <ul className="space-y-2">
                {responses.map((r) => (
                  <li key={r.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.tutorName}</div>
                        {r.note ? <p className="text-muted-foreground text-sm">{r.note}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={RESP_TONE[r.status]} label={RESP_LABEL[r.status]} />
                        <Select
                          value={r.status}
                          onValueChange={(v) =>
                            updateResponseStatus(r.id, v as RequestResponseStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Новый</SelectItem>
                            <SelectItem value="interested">Интересуется</SelectItem>
                            <SelectItem value="declined">Отказ</SelectItem>
                            <SelectItem value="selected">Выбран</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <AddResponseDialog
              open={addingResponse}
              onClose={() => setAddingResponse(false)}
              onCreate={addResponse}
              tutors={tutors}
            />
          </TabsContent>

          <TabsContent value="transitions" className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Разрешённые переходы из текущей стадии. State machine не даст сделать запрещённый шаг.
            </p>
            {availableTransitions.length === 0 ? (
              <p className="rounded border border-dashed p-4 text-center text-sm">
                Из этой стадии переходы невозможны (терминальная).
              </p>
            ) : (
              <div className="grid gap-2">
                {availableTransitions.map((to) => {
                  const s = stages.find((x) => x.kind === to);
                  return (
                    <TransitionRow
                      key={to}
                      stage={s ?? null}
                      to={to}
                      reasons={reasons}
                      tutors={tutors}
                      onGo={(extras) => transition(to, extras)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransitionRow({
  stage,
  to,
  reasons,
  tutors,
  onGo,
}: {
  stage: FunnelStage | null;
  to: RequestStageKind;
  reasons: RejectionReason[];
  tutors: Tutor[];
  onGo: (extras: { tutorId?: string; rejectionReasonId?: string }) => void;
}) {
  const needsReason = to === 'closed_lost';
  const needsTutor = to === 'tutor_found' || to === 'trial_scheduled';
  const [reasonId, setReasonId] = useState<string>(reasons[0]?.id ?? '');
  const [tutorId, setTutorId] = useState<string>(tutors[0]?.id ?? '');

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
      <StagePill name={stage?.name ?? to} color={stage?.color} />
      {needsReason ? (
        <Select value={reasonId} onValueChange={setReasonId}>
          <SelectTrigger className="h-9 w-56">
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
      ) : null}
      {needsTutor ? (
        <Select value={tutorId} onValueChange={setTutorId}>
          <SelectTrigger className="h-9 w-56">
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
      ) : null}
      <Button
        size="sm"
        className="ml-auto"
        onClick={() =>
          onGo({
            tutorId: needsTutor ? tutorId : undefined,
            rejectionReasonId: needsReason ? reasonId : undefined,
          })
        }
      >
        Перевести
      </Button>
    </div>
  );
}

function PublishTab({
  request,
  onPublish,
}: {
  request: Req;
  onPublish: (channels: string[]) => void;
}) {
  const [channels, setChannels] = useState(
    request.publishedChannels.length > 0
      ? request.publishedChannels.join('\n')
      : '@tutors_math_contracts\n@tutors_math_quick',
  );

  const post = renderPost(request);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label>Превью поста в канал</Label>
        <pre className="bg-muted/30 mt-1 whitespace-pre-wrap rounded-md border p-3 font-mono text-sm">
          {post}
        </pre>
      </div>
      <div className="space-y-3">
        <FormField label="Каналы (по одному на строку)">
          <Textarea rows={6} value={channels} onChange={(e) => setChannels(e.target.value)} />
        </FormField>
        {request.publishedChannels.length > 0 ? (
          <div className="text-muted-foreground text-xs">
            Уже опубликовано в {request.publishedChannels.length} каналов ·{' '}
            {request.publishedAt ? formatFull(request.publishedAt) : ''}
          </div>
        ) : null}
        <Button
          onClick={() =>
            onPublish(
              channels
                .split('\n')
                .map((c) => c.trim())
                .filter(Boolean),
            )
          }
        >
          Опубликовать
        </Button>
      </div>
    </div>
  );
}

function renderPost(r: Req): string {
  const lines = [
    'ЗАЯВКА',
    '',
    `Предмет: ${r.subjectName ?? 'уточним'}`,
    `Тип: ${r.dealType === 'contract' ? 'контракт' : 'разовый'}`,
    r.studentName
      ? `Ученик: ${r.studentName}${r.age ? `, ${r.age}` : ''}${r.grade ? `, ${r.grade} кл.` : ''}`
      : null,
    r.schedule ? `График: ${r.schedule}` : null,
    r.pricePerHour ? `Цена/час: ${r.pricePerHour}` : null,
    r.requestPrice ? `Цена заявки: ${r.requestPrice}` : null,
    r.extraInfo ? '' : null,
    r.extraInfo ? `Детали: ${r.extraInfo}` : null,
    '',
    'Откликайтесь в личку @dispatcher_bot',
  ].filter((l): l is string => l !== null);
  return lines.join('\n');
}

function AddResponseDialog({
  open,
  onClose,
  onCreate,
  tutors,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { tutorId: string; note: string | null }) => void;
  tutors: Tutor[];
}) {
  const [tutorId, setTutorId] = useState(tutors[0]?.id ?? '');
  const [note, setNote] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить отклик вручную</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Репетитор">
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
          <FormField label="Комментарий">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!tutorId}
            onClick={() =>
              onCreate({
                tutorId,
                note: note.trim() || null,
              })
            }
          >
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
