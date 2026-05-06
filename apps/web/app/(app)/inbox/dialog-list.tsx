'use client';

import {
  Folder,
  FolderPlus,
  GraduationCap,
  MessagesSquare,
  PenSquare,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import type { Dialog, FunnelStage, InboxFolder, MessengerChannel } from '@tutorcrm/contracts';
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

import { ColoredAvatar } from '@/components/colored-avatar';
import { MessengerIcon } from '@/components/messenger-icon';
import { formatRelativeTime } from '@/lib/format';

import type { InboxFilters } from './inbox-workspace';

const CHANNEL_LABEL: Record<MessengerChannel, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  instagram: 'Instagram',
  facebook: 'Facebook',
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
  stages: FunnelStage[];
  folders: InboxFolder[];
  filters: InboxFilters;
  onFiltersChange: (next: InboxFilters) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelect: (id: string) => void;
  onInitiate: (d: {
    channel: MessengerChannel;
    contact: string;
    firstMessage: string;
    clientId: string | null;
  }) => void;
}

type SystemFolder = 'clients' | 'tutors' | 'work_groups';

export function DialogList({
  items,
  loading,
  activeId,
  stages,
  folders,
  filters,
  onFiltersChange,
  onCreateFolder,
  onDeleteFolder,
  onSelect,
  onInitiate,
}: Props) {
  const [q, setQ] = useState('');
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  // Активная системная папка
  const activeSystem: SystemFolder =
    filters.partyKind === 'tutor'
      ? 'tutors'
      : filters.partyKind === 'work_group'
        ? 'work_groups'
        : 'clients';
  const isCustomFolder = filters.folderId !== null;

  function setSystemFolder(folder: SystemFolder) {
    onFiltersChange({
      ...filters,
      folderId: null,
      partyKind: folder === 'tutors' ? 'tutor' : folder === 'work_groups' ? 'work_group' : null,
    });
  }

  function setCustomFolder(folderId: string) {
    onFiltersChange({
      ...filters,
      folderId,
      partyKind: null,
    });
  }

  const filtered = items.filter((d) => {
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
    <aside className="bg-card flex h-full flex-col border-r">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Поиск…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setInitiateOpen(true)}
          aria-label="Написать первым"
        >
          <PenSquare className="h-4 w-4" />
        </Button>
      </div>

      {/* Папки */}
      <div className="border-b px-2 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <FolderButton
            label="Клиенты"
            icon={<MessagesSquare className="h-3.5 w-3.5" />}
            active={!isCustomFolder && activeSystem === 'clients'}
            onClick={() => setSystemFolder('clients')}
          />
          <FolderButton
            label="Репетиторы"
            icon={<GraduationCap className="h-3.5 w-3.5" />}
            active={!isCustomFolder && activeSystem === 'tutors'}
            onClick={() => setSystemFolder('tutors')}
          />
          <FolderButton
            label="Раб. группы"
            icon={<Users className="h-3.5 w-3.5" />}
            active={!isCustomFolder && activeSystem === 'work_groups'}
            onClick={() => setSystemFolder('work_groups')}
          />
          {folders.map((f) => (
            <FolderButton
              key={f.id}
              label={f.name}
              icon={<Folder className="h-3.5 w-3.5" />}
              active={filters.folderId === f.id}
              onClick={() => setCustomFolder(f.id)}
              onDelete={() => onDeleteFolder(f.id)}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 px-2 text-xs"
            onClick={() => setFolderOpen(true)}
          >
            <FolderPlus className="h-3.5 w-3.5" /> Папка
          </Button>
        </div>
      </div>

      {/* Фильтры мессенджер + стадия */}
      <div className="grid grid-cols-2 gap-2 border-b px-3 py-2">
        <Select
          value={filters.channel ?? '__all'}
          onValueChange={(v) => onFiltersChange({ ...filters, channel: v === '__all' ? null : v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Мессенджер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Все мессенджеры</SelectItem>
            {(Object.keys(CHANNEL_LABEL) as MessengerChannel[]).map((ch) => (
              <SelectItem key={ch} value={ch}>
                {CHANNEL_LABEL[ch]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.stage ?? '__all'}
          onValueChange={(v) => onFiltersChange({ ...filters, stage: v === '__all' ? null : v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Стадия" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Все стадии</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.kind} value={s.kind}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <li className="text-muted-foreground p-8 text-center text-sm">Нет диалогов</li>
        ) : (
          filtered.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onSelect(d.id)}
                className={cn(
                  'hover:bg-muted/50 flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors',
                  activeId === d.id && 'bg-muted/70',
                )}
              >
                {/* Аватар собеседника + бейдж канала в углу */}
                <div className="relative shrink-0">
                  <ColoredAvatar name={d.clientName} className="h-10 w-10" />
                  <span className="ring-card absolute -bottom-1 -right-1 rounded-md ring-2">
                    <MessengerIcon channel={d.channel} size="sm" />
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex w-full items-center gap-2">
                    <span className="flex-1 truncate text-sm font-medium">{d.clientName}</span>
                    <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                      {formatRelativeTime(d.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {d.lastMessagePreview}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge
                      tone={d.stage === 'new_dialog' ? 'warning' : 'info'}
                      label={STAGE_LABEL[d.stage]}
                      className="text-[10px]"
                    />
                    {d.unread > 0 ? (
                      <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-medium tabular-nums">
                        {d.unread}
                      </span>
                    ) : null}
                    {d.slaDueAt && d.stage === 'new_dialog' ? (
                      <StatusBadge tone="danger" label="SLA" className="text-[10px]" />
                    ) : null}
                  </div>
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
      <CreateFolderModal
        open={folderOpen}
        onClose={() => setFolderOpen(false)}
        onCreate={(name) => {
          onCreateFolder(name);
          setFolderOpen(false);
        }}
      />
    </aside>
  );
}

function FolderButton({
  label,
  icon,
  active,
  onClick,
  onDelete,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group inline-flex items-center">
      <Button
        variant={active ? 'secondary' : 'ghost'}
        size="sm"
        onClick={onClick}
        className={cn('h-7 px-2 text-xs font-normal', onDelete && 'pr-1')}
      >
        {icon}
        {label}
        {onDelete ? (
          <span
            role="button"
            aria-label={`Удалить папку ${label}`}
            className="text-muted-foreground hover:text-foreground ml-1 inline-flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </span>
        ) : null}
      </Button>
    </div>
  );
}

function CreateFolderModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <DialogRoot
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setName('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая папка</DialogTitle>
          <DialogDescription>
            Группировка диалогов. Назначить диалог можно из контекстной панели.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Название" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onCreate(name.trim());
              setName('');
            }}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
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
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
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
