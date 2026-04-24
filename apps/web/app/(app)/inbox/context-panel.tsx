'use client';

import { useState } from 'react';

import type { Dialog, Lead } from '@tutorcrm/contracts';
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
  StatusBadge,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

interface Props {
  dialog: Dialog | null;
  onDialogUpdated: (d: Dialog) => void;
}

const STAGE_LABEL: Record<Dialog['stage'], string> = {
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

export function ContextPanel({ dialog, onDialogUpdated }: Props) {
  const [leadOpen, setLeadOpen] = useState(false);

  if (!dialog) {
    return (
      <aside className="h-full border-l bg-card p-6">
        <EmptyState title="Контекст" description="Выберите диалог, чтобы увидеть детали и действия." />
      </aside>
    );
  }

  async function createLead(data: {
    clientName: string;
    phone: string | null;
    subject: string | null;
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

  return (
    <aside className="flex h-full flex-col gap-3 overflow-y-auto border-l bg-card p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{dialog.clientName}</CardTitle>
          <div className="flex flex-wrap gap-1 pt-1">
            <StatusBadge tone="info" label={STAGE_LABEL[dialog.stage]} />
            <StatusBadge tone="neutral" label={dialog.channel.toUpperCase()} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Client ID" value={dialog.clientId ?? '—'} />
          <Row label="Lead ID" value={dialog.leadId ?? '—'} />
          <Row label="Dispatcher" value={dialog.dispatcherId ?? '—'} />
          <Row label="External ID" value={dialog.externalId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Следующие действия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dialog.stage === 'new_dialog' ? (
            <>
              <Button className="w-full" onClick={() => setLeadOpen(true)}>
                Создать лид из диалога
              </Button>
              <p className="text-xs text-muted-foreground">
                Следующий шаг: распознать запрос и создать лид с контактами клиента.
              </p>
            </>
          ) : dialog.stage === 'lead_created' ? (
            <>
              <Button className="w-full" disabled>
                Сформировать заявку
              </Button>
              <p className="text-xs text-muted-foreground">Заявки появятся на этапе FE-5.</p>
            </>
          ) : dialog.stage === 'request_created' ? (
            <>
              <Button className="w-full" disabled>
                Опубликовать в канал
              </Button>
              <p className="text-xs text-muted-foreground">Публикация — FE-5.</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Для текущего этапа действия ещё не реализованы (будут на FE-5 / FE-6).
            </p>
          )}
        </CardContent>
      </Card>

      <CreateLeadFromDialogModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        onCreate={createLead}
        defaultName={dialog.clientName}
      />
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-xs break-all">{value}</span>
    </div>
  );
}

function CreateLeadFromDialogModal({
  open,
  onClose,
  onCreate,
  defaultName,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: {
    clientName: string;
    phone: string | null;
    subject: string | null;
    note: string | null;
  }) => void;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');

  function reset() {
    setName(defaultName);
    setPhone('');
    setSubject('');
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
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </FormField>
          <FormField label="Заметка">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onCreate({
                clientName: name.trim(),
                phone: phone.trim() || null,
                subject: subject.trim() || null,
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
