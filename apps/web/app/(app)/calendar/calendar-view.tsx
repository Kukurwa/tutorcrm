'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CalendarEvent, CalendarEventKind, Task, TaskStatus } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  StatusBadge,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

const MONTHS_NOM = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type DayKey = string; // 'YYYY-MM-DD'

function dayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayKeyFromIso(iso: string): DayKey {
  return dayKey(new Date(iso));
}

/** Monday = 0..Sunday = 6 */
function weekdayMondayBased(date: Date): number {
  const dow = date.getDay(); // Sun = 0
  return (dow + 6) % 7;
}

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlank = weekdayMondayBased(firstOfMonth);
  const gridStart = new Date(year, month, 1 - leadingBlank);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function padTime(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTimeRange(startAt: string, endAt: string) {
  const a = new Date(startAt);
  const b = new Date(endAt);
  return `${padTime(a.getHours())}:${padTime(a.getMinutes())}–${padTime(b.getHours())}:${padTime(b.getMinutes())}`;
}

export interface CalendarViewProps {
  initialEvents: CalendarEvent[];
  initialTasks: Task[];
  currentUserId: string;
}

export function CalendarView({ initialEvents, initialTasks, currentUserId }: CalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events] = useState<CalendarEvent[]>(initialEvents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeDay, setActiveDay] = useState<Date | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<DayKey, CalendarEvent[]>();
    for (const e of events) {
      const key = dayKeyFromIso(e.startAt);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<DayKey, Task[]>();
    for (const t of tasks) {
      if (t.status !== 'open' && t.status !== 'snoozed') continue;
      const key = dayKeyFromIso(t.dueAt);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const todayKey = dayKey(today);

  async function createTask(d: { title: string; note: string | null; dueAt: string }) {
    try {
      const res = await api.post<{ task: Task }>('/api/tasks', {
        kind: 'manual',
        title: d.title,
        note: d.note,
        dueAt: d.dueAt,
        assignedToId: currentUserId,
        relatedRequestId: null,
        relatedContractId: null,
        relatedDialogId: null,
      });
      setTasks((p) => [...p, res.task]);
      setCreatingTask(false);
      toast.success('Задача создана');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function updateTaskStatus(id: string, status: TaskStatus) {
    try {
      const res = await api.patch<{ task: Task }>(`/api/tasks/${id}`, { status });
      setTasks((p) => p.map((t) => (t.id === id ? res.task : t)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Предыдущий месяц"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[160px] text-center text-base font-semibold">
              {MONTHS_NOM[month]} {year}
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Следующий месяц"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = new Date();
                setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
              }}
            >
              Сегодня
            </Button>
            <Button size="sm" onClick={() => setCreatingTask(true)}>
              <Plus className="h-4 w-4" /> Новая задача
            </Button>
          </div>
        </header>

        <div className="bg-border text-muted-foreground grid grid-cols-7 gap-px rounded-md border text-center text-xs">
          {WEEKDAYS.map((w) => (
            <div key={w} className="bg-background p-2 font-medium">
              {w}
            </div>
          ))}
          {grid.map((date) => {
            const key = dayKey(date);
            const inMonth = date.getMonth() === month;
            const isToday = key === todayKey;
            const dayEvents = eventsByDay.get(key) ?? [];
            const dayTasks = tasksByDay.get(key) ?? [];
            const hasAny = dayEvents.length > 0 || dayTasks.length > 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDay(date)}
                className={cn(
                  'bg-background hover:bg-accent/40 group relative flex aspect-square min-h-[80px] flex-col items-start gap-1 p-2 text-left text-sm transition-colors',
                  !inMonth && 'bg-muted/40 text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday && 'bg-primary text-primary-foreground',
                  )}
                >
                  {date.getDate()}
                </span>
                {hasAny ? (
                  <div className="mt-auto flex w-full flex-wrap gap-1">
                    {dayTasks.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {dayTasks.length}
                      </span>
                    ) : null}
                    {dayEvents.filter((e) => e.kind === 'trial').length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {dayEvents.filter((e) => e.kind === 'trial').length}
                      </span>
                    ) : null}
                    {dayEvents.filter((e) => e.kind === 'regular_lesson').length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {dayEvents.filter((e) => e.kind === 'regular_lesson').length}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> задачи
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> пробные
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> регулярные занятия
          </span>
        </div>
      </CardContent>

      {activeDay ? (
        <DayDialog
          day={activeDay}
          tasks={tasksByDay.get(dayKey(activeDay)) ?? []}
          events={eventsByDay.get(dayKey(activeDay)) ?? []}
          onClose={() => setActiveDay(null)}
          onTaskStatus={updateTaskStatus}
          onNewTask={() => {
            setActiveDay(null);
            setCreatingTask(true);
          }}
        />
      ) : null}

      <TaskDialog
        open={creatingTask}
        onClose={() => setCreatingTask(false)}
        onCreate={createTask}
      />
    </Card>
  );
}

function DayDialog({
  day,
  tasks,
  events,
  onClose,
  onTaskStatus,
  onNewTask,
}: {
  day: Date;
  tasks: Task[];
  events: CalendarEvent[];
  onClose: () => void;
  onTaskStatus: (id: string, status: TaskStatus) => void;
  onNewTask: () => void;
}) {
  const monthName = MONTHS_NOM[day.getMonth()] ?? '';
  const weekdayName = WEEKDAYS[weekdayMondayBased(day)] ?? '';
  const title = `${day.getDate()} ${monthName.toLowerCase()}, ${weekdayName}`;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {tasks.length === 0 && events.length === 0 ? (
          <p className="text-muted-foreground rounded border border-dashed p-6 text-center text-sm">
            Ничего не запланировано
          </p>
        ) : null}

        {tasks.length > 0 ? (
          <section className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Задачи ({tasks.length})
            </div>
            <ul className="space-y-1.5">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2 rounded border p-2 text-sm">
                  <div className="flex-1 space-y-0.5">
                    <div className="font-medium">{t.title}</div>
                    {t.note ? <div className="text-muted-foreground text-xs">{t.note}</div> : null}
                  </div>
                  <div className="flex gap-1">
                    {t.status === 'open' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onTaskStatus(t.id, 'done')}
                        >
                          Закрыть
                        </Button>
                      </>
                    ) : (
                      <StatusBadge
                        tone={t.status === 'done' ? 'success' : 'neutral'}
                        label={t.status === 'done' ? 'выполнена' : t.status}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {events.length > 0 ? (
          <section className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              События ({events.length})
            </div>
            <ul className="space-y-1.5">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded border p-2 text-sm">
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatTimeRange(e.startAt, e.endAt)}
                  </span>
                  <StatusBadge
                    tone={e.kind === 'trial' ? 'warning' : 'success'}
                    label={e.kind === 'trial' ? 'пробный' : 'занятие'}
                  />
                  <div className="flex-1 font-medium">{e.title}</div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
          <Button onClick={onNewTask}>
            <Plus className="h-4 w-4" /> Новая задача
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
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
  const [dueDate, setDueDate] = useState(() => dayKey(new Date()));
  const [dueTime, setDueTime] = useState('10:00');

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setTitle('');
          setNote('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Название" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Заметка">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Дата">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
            <FormField label="Время">
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              const iso = new Date(`${dueDate}T${dueTime}:00`).toISOString();
              onCreate({
                title: title.trim(),
                note: note.trim() || null,
                dueAt: iso,
              });
              setTitle('');
              setNote('');
            }}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Типы используются в `calendar-view` выше; экспорт не обязателен
export type { CalendarEventKind };
