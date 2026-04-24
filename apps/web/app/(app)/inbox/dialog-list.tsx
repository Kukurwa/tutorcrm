'use client';

import { PenSquare, Search } from 'lucide-react';
import { useState } from 'react';

import type { Dialog, MessengerChannel } from '@tutorcrm/contracts';
import {
  Button,
  cn,
  Dialog as DialogRoot,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  Textarea,
} from '@tutorcrm/ui';

import { formatRelativeTime } from '@/lib/format';

const CHANNEL_ICON: Record<MessengerChannel, string> = {
  telegram: 'TG',
  whatsapp: 'WA',
  viber: 'VB',
  instagram: 'IG',
  facebook: 'FB',
};

const STAGE_LABEL: Record<Dialog['stage'], string> = {
  new_dialog: 'Новый',
  lead_created: 'Лид',
  request_created: 'Заявка',
  published: 'Опубликована',
  searching_tutor: 'Поиск',
  tutor_found: 'Найден',
  trial_scheduled: 'Пробный назначен',
  trial_done: 'Пробный проведён',
  active: 'Активен',
  closed_won: 'Успех',
  closed_lost: 'Отказ',
};

interface Props {
  items: Dialog[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onInitiate: (d: {
    channel: MessengerChannel;
    contact: string;
    firstMessage: string;
    clientId: string | null;
  }) => void;
}

export function DialogList({ items, loading, activeId, onSelect, onInitiate }: Props) {
  const [q, setQ] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [initiateOpen, setInitiateOpen] = useState(false);

  const filtered = items.filter((d) => {
    if (mineOnly && !d.dispatcherId) return true;
    if (q.trim()) {
      const needle = q.toLowerCase();
      if (
        !d.clientName.toLowerCase().includes(needle) &&
        !d.lastMessagePreview.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <aside className="flex h-full flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button size="icon" variant="outline" onClick={() => setInitiateOpen(true)} aria-label="Написать первым">
          <PenSquare className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <button
          className={cn('rounded px-2 py-1', !mineOnly && 'bg-muted font-medium text-foreground')}
          onClick={() => setMineOnly(false)}
        >
          Все
        </button>
        <button
          className={cn('rounded px-2 py-1', mineOnly && 'bg-muted font-medium text-foreground')}
          onClick={() => setMineOnly(true)}
        >
          Не назначенные
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {loading ? (
          <li className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </li>
        ) : filtered.length === 0 ? (
          <li className="p-8 text-center text-sm text-muted-foreground">
            Нет диалогов
          </li>
        ) : (
          filtered.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onSelect(d.id)}
                className={cn(
                  'flex w-full flex-col items-start gap-1 border-b px-3 py-2 text-left transition-colors hover:bg-muted/50',
                  activeId === d.id && 'bg-muted/70',
                )}
              >
                <div className="flex w-full items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                    {CHANNEL_ICON[d.channel]}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{d.clientName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(d.lastMessageAt)}
                  </span>
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {d.lastMessagePreview}
                </p>
                <div className="flex items-center gap-1.5">
                  <StatusBadge
                    tone={d.stage === 'new_dialog' ? 'warning' : 'info'}
                    label={STAGE_LABEL[d.stage]}
                    className="text-[10px]"
                  />
                  {d.unread > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                      {d.unread}
                    </span>
                  ) : null}
                  {d.slaDueAt && d.stage === 'new_dialog' ? (
                    <StatusBadge tone="danger" label="SLA" className="text-[10px]" />
                  ) : null}
                </div>
              </button>
            </li>
          ))
        )}
      </ul>

      <InitiateDialogModal
        open={initiateOpen}
        onClose={() => setInitiateOpen(false)}
        onCreate={(d) => {
          onInitiate(d);
          setInitiateOpen(false);
        }}
      />
    </aside>
  );
}

function InitiateDialogModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: {
    channel: MessengerChannel;
    contact: string;
    firstMessage: string;
    clientId: string | null;
  }) => void;
}) {
  const [channel, setChannel] = useState<MessengerChannel>('telegram');
  const [contact, setContact] = useState('');
  const [firstMessage, setFirstMessage] = useState('');

  function reset() {
    setChannel('telegram');
    setContact('');
    setFirstMessage('');
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
          <DialogTitle>Написать первым</DialogTitle>
          <DialogDescription>
            Инициация диалога по номеру или username. В моке сообщение «уходит» сразу.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Канал">
            <Select value={channel} onValueChange={(v) => setChannel(v as MessengerChannel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="viber">Viber</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Контакт" description="Телефон или @username">
            <Input value={contact} onChange={(e) => setContact(e.target.value)} />
          </FormField>
          <FormField label="Первое сообщение" required>
            <Textarea
              rows={4}
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!contact.trim() || !firstMessage.trim()}
            onClick={() => {
              onCreate({
                channel,
                contact: contact.trim(),
                firstMessage: firstMessage.trim(),
                clientId: null,
              });
              reset();
            }}
          >
            Отправить
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
