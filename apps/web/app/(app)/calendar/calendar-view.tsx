'use client';

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CalendarEvent, CalendarEventKind } from '@tutorcrm/contracts';
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
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

export function CalendarView({ initial }: { initial: CalendarEvent[] }) {
  const [events, setEvents] = useState<CalendarEvent[]>(initial);
  const [creating, setCreating] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const day = new Date(e.startAt).toISOString().slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(e);
      map.set(day, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  async function create(d: {
    kind: CalendarEventKind;
    title: string;
    startAt: string;
    endAt: string;
  }) {
    try {
      const res = await api.post<{ event: CalendarEvent }>('/api/calendar-events', {
        ...d,
        contractId: null,
        requestId: null,
        tutorId: null,
        clientId: null,
        note: null,
      });
      setEvents((p) =>
        [...p, res.event].sort((a, b) => a.startAt.localeCompare(b.startAt)),
      );
      setCreating(false);
      toast.success('Событие добавлено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Расписание</CardTitle>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Событие
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {byDay.length === 0 ? (
          <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            Нет запланированных занятий
          </p>
        ) : null}
        {byDay.map(([day, list]) => (
          <div key={day}>
            <div className="mb-2 text-sm font-medium text-muted-foreground">
              {new Date(day).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </div>
            <ul className="space-y-2">
              {list.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded border p-2">
                  <div className="font-mono text-sm">
                    {new Date(e.startAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(e.endAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <StatusBadge
                    tone={e.kind === 'trial' ? 'warning' : 'info'}
                    label={e.kind === 'trial' ? 'пробный' : 'регулярный'}
                  />
                  <div className="flex-1 font-medium">{e.title}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
      <CreateEventDialog open={creating} onClose={() => setCreating(false)} onCreate={create} />
    </Card>
  );
}

function CreateEventDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: {
    kind: CalendarEventKind;
    title: string;
    startAt: string;
    endAt: string;
  }) => void;
}) {
  const [kind, setKind] = useState<CalendarEventKind>('regular_lesson');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() =>
    new Date(Date.now() + 3600_000).toISOString().slice(0, 16),
  );
  const [end, setEnd] = useState(() =>
    new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 16),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое событие</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Тип">
            <Select value={kind} onValueChange={(v) => setKind(v as CalendarEventKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Пробный</SelectItem>
                <SelectItem value="regular_lesson">Регулярное занятие</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Название" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Начало">
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </FormField>
            <FormField label="Конец">
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!title.trim()}
            onClick={() =>
              onCreate({
                kind,
                title: title.trim(),
                startAt: new Date(start).toISOString(),
                endAt: new Date(end).toISOString(),
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
