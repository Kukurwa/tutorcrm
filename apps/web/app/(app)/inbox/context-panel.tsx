'use client';

import { useState } from 'react';

import type {
  Dialog,
  DialogStage,
  FunnelStage,
  Lead,
  Request as Req,
  Subject,
} from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog as DialogRoot,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

interface Props {
  dialog: Dialog | null;
  subjects: Subject[];
  stages: FunnelStage[];
  onDialogUpdated: (d: Dialog) => void;
}

const STAGE_LABEL: Record<DialogStage, string> = {
  new_dialog: 'Новый диалог',
  lead_created: 'Лид создан',
  request_created: 'Заявка сформирована',
  published: 'Опубликована',
  searching_tutor: 'Поиск репетитора',
  tutor_found: 'Репетитор найден',
  trial_scheduled: 'Пробный назначен',
  trial_done: 'Пробный проведён',
  active: 'Активен',
  closed_won: 'Закрыт (успех)',
  closed_lost: 'Закрыт (отказ)',
};

export function ContextPanel({ dialog, subjects, stages, onDialogUpdated }: Props) {
  const [leadOpen, setLeadOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  if (!dialog) {
    return (
      <aside className="bg-card h-full border-l p-6">
        <EmptyState
          title="Контекст"
          description="Выберите диалог, чтобы увидеть детали и действия."
        />
      </aside>
    );
  }

  async function createLead(data: {
    clientName: string;
    phone: string | null;
    subjectId: string | null;
    note: string | null;
  }) {
    if (!dialog) return;
    try {
      const res = await api.post<{ lead: Lead; dialog: Dialog }>(
        `/api/dialogs/${dialog.id}/create-lead`,
        data,
      );
      onDialogUpdated(res.dialog);
      setLeadOpen(false);
      toast.success('Лид создан');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function createRequest(data: CreateRequestPayload) {
    if (!dialog) return;
    try {
      const res = await api.post<{ request: Req; dialog: Dialog }>(
        `/api/dialogs/${dialog.id}/create-request`,
        data,
      );
      onDialogUpdated(res.dialog);
      setRequestOpen(false);
      toast.success('Заявка создана');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function changeStage(next: DialogStage) {
    if (!dialog || dialog.stage === next) return;
    try {
      const res = await api.patch<{ dialog: Dialog }>(`/api/dialogs/${dialog.id}`, {
        stage: next,
      });
      onDialogUpdated(res.dialog);
      toast.success('Стадия обновлена');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <aside className="bg-card flex h-full flex-col gap-3 overflow-y-auto border-l p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{dialog.clientName}</CardTitle>
          <div className="flex flex-wrap gap-1 pt-1">
            <StatusBadge tone="info" label={STAGE_LABEL[dialog.stage]} />
            <StatusBadge tone="neutral" label={dialog.channel.toUpperCase()} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="ID клиента" value={dialog.clientId ?? '—'} />
          <Row label="ID лида" value={dialog.leadId ?? '—'} />
          <Row label="ID заявки" value={dialog.requestId ?? '—'} />
          <Row label="Диспетчер" value={dialog.dispatcherId ?? '—'} />
          <Row label="Внешний ID" value={dialog.externalId} />
        </CardContent>
      </Card>

      {/* Смена стадии прямо в переписке */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Стадия воронки</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={dialog.stage} onValueChange={(v) => changeStage(v as DialogStage)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.kind} value={s.kind}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Следующие действия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dialog.stage === 'new_dialog' ? (
            <Button className="w-full" onClick={() => setLeadOpen(true)}>
              Создать лид из диалога
            </Button>
          ) : null}
          {(dialog.stage === 'lead_created' ||
            dialog.stage === 'new_dialog' ||
            dialog.stage === 'request_created') &&
          dialog.clientId ? (
            <Button
              className="w-full"
              variant={dialog.stage === 'request_created' ? 'outline' : 'default'}
              onClick={() => setRequestOpen(true)}
            >
              {dialog.stage === 'request_created' ? 'Пересоздать заявку' : 'Сформировать заявку'}
            </Button>
          ) : null}
          {dialog.partyKind !== 'client' ? (
            <p className="text-muted-foreground text-xs">
              Это {dialog.partyKind === 'tutor' ? 'диалог с репетитором' : 'рабочая группа'} —
              действия по клиентской воронке недоступны.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <CreateLeadFromDialogModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        onCreate={createLead}
        defaultName={dialog.clientName}
        subjects={subjects}
      />
      <CreateRequestFromDialogModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onCreate={createRequest}
        defaultName={dialog.clientName}
        subjects={subjects}
      />
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className="break-all text-right font-mono text-xs">{value}</span>
    </div>
  );
}

function CreateLeadFromDialogModal({
  open,
  onClose,
  onCreate,
  defaultName,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: {
    clientName: string;
    phone: string | null;
    subjectId: string | null;
    note: string | null;
  }) => void;
  defaultName: string;
  subjects: Subject[];
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [note, setNote] = useState('');

  function reset() {
    setName(defaultName);
    setPhone('');
    setSubjectId('');
    setNote('');
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать лид из диалога</DialogTitle>
          <DialogDescription>
            Клиент будет автоматически создан или подхвачен по телефону.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Имя" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Телефон">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <FormField label="Предмет">
            <Select
              value={subjectId === '' ? '__none' : subjectId}
              onValueChange={(v) => setSubjectId(v === '__none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не выбрано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Не выбрано</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Заметка">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onCreate({
                clientName: name.trim(),
                phone: phone.trim() || null,
                subjectId: subjectId === '' ? null : subjectId,
                note: note.trim() || null,
              })
            }
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

type CreateRequestPayload = {
  subjectId: string | null;
  dealType: 'contract' | 'one_time';
  studentName: string | null;
  age: number | null;
  grade: string | null;
  schedule: string | null;
  pricePerHour: string | null;
  requestPrice: string | null;
  extraInfo: string | null;
  description: string;
};

function CreateRequestFromDialogModal({
  open,
  onClose,
  onCreate,
  defaultName,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: CreateRequestPayload) => void;
  defaultName: string;
  subjects: Subject[];
}) {
  const [subjectId, setSubjectId] = useState<string>('');
  const [dealType, setDealType] = useState<'contract' | 'one_time'>('contract');
  const [studentName, setStudentName] = useState(defaultName);
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [schedule, setSchedule] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [requestPrice, setRequestPrice] = useState('');
  const [extraInfo, setExtraInfo] = useState('');

  function reset() {
    setSubjectId('');
    setDealType('contract');
    setStudentName(defaultName);
    setAge('');
    setGrade('');
    setSchedule('');
    setPricePerHour('');
    setRequestPrice('');
    setExtraInfo('');
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Сформировать заявку из диалога</DialogTitle>
          <DialogDescription>
            Все поля необязательные. В ценах можно указать «Договорная».
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Предмет">
              <Select
                value={subjectId === '' ? '__none' : subjectId}
                onValueChange={(v) => setSubjectId(v === '__none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не выбрано" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Не выбрано</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Тип сделки">
              <Select
                value={dealType}
                onValueChange={(v) => setDealType(v as 'contract' | 'one_time')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Контрактный</SelectItem>
                  <SelectItem value="one_time">Разовый</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Имя ученика">
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </FormField>
            <FormField label="Возраст">
              <Input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
            </FormField>
            <FormField label="Класс">
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Желаемый график">
            <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Цена в час" description="Число или «Договорная»">
              <Input value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} />
            </FormField>
            <FormField label="Цена заявки" description="Число или «Договорная»">
              <Input value={requestPrice} onChange={(e) => setRequestPrice(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Доп. информация">
            <Textarea
              rows={3}
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Цели, особенности, ограничения…"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() =>
              onCreate({
                subjectId: subjectId === '' ? null : subjectId,
                dealType,
                studentName: studentName.trim() || null,
                age: age === '' ? null : Number(age),
                grade: grade.trim() || null,
                schedule: schedule.trim() || null,
                pricePerHour: pricePerHour.trim() || null,
                requestPrice: requestPrice.trim() || null,
                extraInfo: extraInfo.trim() || null,
                description: extraInfo.trim() || studentName.trim() || '',
              })
            }
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
