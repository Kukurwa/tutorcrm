'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { Task, TaskKind, TaskStatus } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
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
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { formatFull, formatRelativeTime } from '@/lib/format';

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Открыта',
  snoozed: 'Отложена',
  done: 'Выполнена',
  cancelled: 'Отменена',
};

const KIND_LABEL: Record<TaskKind, string> = {
  feedback_after_trial: 'Фидбек после пробного',
  sla_new_dialog: 'SLA: новый диалог',
  sla_request: 'SLA: заявка',
  weekly_lessons_missing: 'Не внесено уроков',
  invoice_overdue: 'Инвойс просрочен',
  manual: 'Ручная',
};

export function TasksList({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [creating, setCreating] = useState(false);

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'open') return t.status === 'open' || t.status === 'snoozed';
    if (filter === 'done') return t.status === 'done' || t.status === 'cancelled';
    return true;
  });

  async function update(id: string, patch: Partial<Task>) {
    try {
      const res = await api.patch<{ task: Task }>(`/api/tasks/${id}`, patch);
      setTasks((p) => p.map((t) => (t.id === id ? res.task : t)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function create(d: { title: string; note: string | null; dueAt: string }) {
    try {
      const res = await api.post<{ task: Task }>('/api/tasks', {
        kind: 'manual',
        ...d,
      });
      setTasks((p) => [res.task, ...p]);
      setCreating(false);
      toast.success('Задача создана');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle>Задачи</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="open">Активные</SelectItem>
              <SelectItem value="done">Закрытые</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Новая задача
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {filtered.length === 0 ? (
            <li className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
              Нет задач
            </li>
          ) : null}
          {filtered.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-4 rounded border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge
                    tone={
                      t.status === 'open'
                        ? 'warning'
                        : t.status === 'snoozed'
                          ? 'neutral'
                          : t.status === 'done'
                            ? 'success'
                            : 'danger'
                    }
                    label={STATUS_LABEL[t.status]}
                  />
                  <span className="text-xs text-muted-foreground">{KIND_LABEL[t.kind]}</span>
                </div>
                <div className="mt-1 font-medium">{t.title}</div>
                {t.note ? <p className="text-sm text-muted-foreground">{t.note}</p> : null}
                <div className="mt-1 text-xs text-muted-foreground">
                  до {formatRelativeTime(t.dueAt)} ({formatFull(t.dueAt)})
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {t.status !== 'done' ? (
                  <Button size="sm" variant="outline" onClick={() => update(t.id, { status: 'done' })}>
                    Готово
                  </Button>
                ) : null}
                {t.status === 'open' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update(t.id, {
                        status: 'snoozed',
                        snoozedUntil: new Date(Date.now() + 3600_000).toISOString(),
                      })
                    }
                  >
                    +1 час
                  </Button>
                ) : null}
                {t.status !== 'cancelled' && t.status !== 'done' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update(t.id, { status: 'cancelled' })}
                  >
                    Отменить
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <CreateTaskDialog open={creating} onClose={() => setCreating(false)} onCreate={create} />
    </Card>
  );
}

function CreateTaskDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { title: string; note: string | null; dueAt: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState(() =>
    new Date(Date.now() + 3600_000).toISOString().slice(0, 16),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Название" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Заметка">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <FormField label="Срок" required>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!title.trim()}
            onClick={() =>
              onCreate({
                title: title.trim(),
                note: note.trim() || null,
                dueAt: new Date(dueAt).toISOString(),
              })
            }
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
