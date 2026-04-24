'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type {
  DealType,
  Subject,
  SubjectChannel,
} from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
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
  StatusBadge,
  Switch,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

interface Props {
  initial: Subject[];
  initialChannels: SubjectChannel[];
}

const DEAL_TYPE_LABEL: Record<DealType, string> = {
  contract: 'Контрактный',
  one_time: 'Разовый',
};

export function SubjectsTab({ initial, initialChannels }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>(initial);
  const [channels, setChannels] = useState<SubjectChannel[]>(initialChannels);
  const [addOpen, setAddOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState<Subject | null>(null);

  async function createSubject(name: string) {
    try {
      const res = await api.post<{ subject: Subject }>('/api/subjects', { name, active: true });
      setSubjects((p) => [...p, res.subject].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Предмет добавлен');
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function toggleActive(s: Subject) {
    try {
      const res = await api.patch<{ subject: Subject }>(`/api/subjects/${s.id}`, {
        active: !s.active,
      });
      setSubjects((p) => p.map((x) => (x.id === s.id ? res.subject : x)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function removeSubject(s: Subject) {
    if (!confirm(`Удалить предмет «${s.name}»?`)) return;
    try {
      await api.delete(`/api/subjects/${s.id}`);
      setSubjects((p) => p.filter((x) => x.id !== s.id));
      setChannels((p) => p.filter((c) => c.subjectId !== s.id));
      toast.success('Предмет удалён');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function addChannel(data: {
    subjectId: string;
    dealType: DealType;
    channelName: string;
  }) {
    try {
      const res = await api.post<{ channel: SubjectChannel }>('/api/subject-channels', {
        ...data,
        active: true,
      });
      setChannels((p) => [...p, res.channel]);
      toast.success('Канал привязан');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function removeChannel(id: string) {
    try {
      await api.delete(`/api/subject-channels/${id}`);
      setChannels((p) => p.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Предметы</CardTitle>
          <p className="text-sm text-muted-foreground">
            Список предметов и привязка каналов для публикации заявок.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          getRowId={(s) => s.id}
          rows={subjects}
          emptyTitle="Нет предметов"
          columns={[
            { key: 'name', header: 'Название', cell: (s) => <span className="font-medium">{s.name}</span> },
            {
              key: 'channels',
              header: 'Каналы',
              cell: (s) => {
                const rows = channels.filter((c) => c.subjectId === s.id);
                if (rows.length === 0) {
                  return <span className="text-xs text-muted-foreground">Нет каналов</span>;
                }
                return (
                  <div className="flex flex-wrap gap-1">
                    {rows.map((c) => (
                      <span
                        key={c.id}
                        className="group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                      >
                        <span className="font-mono">{c.channelName}</span>
                        <span className="text-muted-foreground">
                          · {DEAL_TYPE_LABEL[c.dealType]}
                        </span>
                        <button
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          onClick={() => removeChannel(c.id)}
                          aria-label="Удалить канал"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                );
              },
            },
            {
              key: 'active',
              header: 'Активен',
              cell: (s) => <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              cell: (s) => (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setChannelOpen(s)}>
                    Канал
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubject(s)}
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </CardContent>

      <AddSubjectDialog open={addOpen} onOpenChange={setAddOpen} onCreate={createSubject} />
      <AddChannelDialog
        subject={channelOpen}
        onClose={() => setChannelOpen(null)}
        onCreate={addChannel}
      />
    </Card>
  );
}

function AddSubjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setName(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый предмет</DialogTitle>
          <DialogDescription>Добавьте предмет в справочник.</DialogDescription>
        </DialogHeader>
        <FormField label="Название" htmlFor="subject-name" required>
          <Input
            id="subject-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Биология"
          />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddChannelDialog({
  subject,
  onClose,
  onCreate,
}: {
  subject: Subject | null;
  onClose: () => void;
  onCreate: (d: { subjectId: string; dealType: DealType; channelName: string }) => void;
}) {
  const [dealType, setDealType] = useState<DealType>('contract');
  const [channelName, setChannelName] = useState('');

  return (
    <Dialog
      open={subject !== null}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setChannelName('');
          setDealType('contract');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Привязать канал</DialogTitle>
          <DialogDescription>
            Предмет: {subject?.name}. Канал для публикации заявок.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Тип сделки">
            <Select value={dealType} onValueChange={(v) => setDealType(v as DealType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Контрактный</SelectItem>
                <SelectItem value="one_time">Разовый</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Канал" htmlFor="channel-name" required>
            <Input
              id="channel-name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="@tutors_..."
            />
          </FormField>
          <div className="text-xs text-muted-foreground">
            <StatusBadge tone="info" label="Telegram" /> В реальной работе подставит модуль Telegram.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!channelName.trim() || !subject}
            onClick={() => {
              if (!subject) return;
              onCreate({
                subjectId: subject.id,
                dealType,
                channelName: channelName.trim(),
              });
              onClose();
              setChannelName('');
            }}
          >
            Привязать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
