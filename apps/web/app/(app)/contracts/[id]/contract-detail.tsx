'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  Contract,
  ContractEvent,
  Invoice,
  Lesson,
  LessonStatus,
  OneTimeDealPayment,
  Tutor,
  WeeklyLessonCount,
} from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { formatCurrency, formatFull } from '@/lib/format';

const LESSON_TONE: Record<LessonStatus, 'success' | 'warning' | 'danger'> = {
  success: 'success',
  rescheduled: 'warning',
  cancelled: 'danger',
};

const LESSON_LABEL: Record<LessonStatus, string> = {
  success: 'Успешно',
  rescheduled: 'Перенесено',
  cancelled: 'Отмена',
};

interface Props {
  contract: Contract;
  events: ContractEvent[];
  weekly: WeeklyLessonCount[];
  lessons: Lesson[];
  tutors: Tutor[];
  payments: OneTimeDealPayment[];
}

export function ContractDetail({
  contract: initialContract,
  events: initialEvents,
  weekly: initialWeekly,
  lessons: initialLessons,
  tutors,
  payments: initialPayments,
}: Props) {
  const [contract, setContract] = useState(initialContract);
  const [events, setEvents] = useState(initialEvents);
  const [weekly, setWeekly] = useState(initialWeekly);
  const [lessons, setLessons] = useState(initialLessons);
  const [payments, setPayments] = useState(initialPayments);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [closeOpen, setCloseOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);

  useEffect(() => {
    api
      .get<{ items: Invoice[] }>(`/api/invoices?contractId=${contract.id}`)
      .then((res) => setInvoices(res.items))
      .catch(() => {});
  }, [contract.id]);

  async function patchContract(data: Partial<Contract>) {
    try {
      const res = await api.patch<{ contract: Contract }>(`/api/contracts/${contract.id}`, data);
      setContract(res.contract);
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function pause() {
    try {
      const res = await api.post<{ contract: Contract; event: ContractEvent }>(
        `/api/contracts/${contract.id}/pause`,
        { note: 'Поставлено на паузу' },
      );
      setContract(res.contract);
      setEvents((p) => [res.event, ...p]);
      toast.success('На паузе');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function resume() {
    try {
      const res = await api.post<{ contract: Contract; event: ContractEvent }>(
        `/api/contracts/${contract.id}/resume`,
      );
      setContract(res.contract);
      setEvents((p) => [res.event, ...p]);
      toast.success('Возобновлено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function closeContract(reason: string) {
    try {
      const res = await api.post<{ contract: Contract; event: ContractEvent }>(
        `/api/contracts/${contract.id}/close`,
        { reason },
      );
      setContract(res.contract);
      setEvents((p) => [res.event, ...p]);
      setCloseOpen(false);
      toast.success('Закрыт');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function replaceTutor(tutorId: string, note: string) {
    try {
      const res = await api.post<{ contract: Contract; event: ContractEvent }>(
        `/api/contracts/${contract.id}/replace-tutor`,
        { tutorId, note },
      );
      setContract(res.contract);
      setEvents((p) => [res.event, ...p]);
      setReplaceOpen(false);
      toast.success('Репетитор заменён');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function addLesson(date: string, status: LessonStatus, note: string | null) {
    try {
      const res = await api.post<{ lesson: Lesson }>('/api/lessons', {
        contractId: contract.id,
        date,
        status,
        note,
      });
      setLessons((p) => [...p, res.lesson].sort((a, b) => a.date.localeCompare(b.date)));
      setLessonOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function patchLesson(id: string, data: Partial<Lesson>) {
    try {
      const res = await api.patch<{ lesson: Lesson }>(`/api/lessons/${id}`, data);
      setLessons((p) => p.map((l) => (l.id === id ? res.lesson : l)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function deleteLesson(id: string) {
    try {
      await api.delete(`/api/lessons/${id}`);
      setLessons((p) => p.filter((l) => l.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function submitWeekly(weekStart: string, count: number) {
    try {
      const res = await api.post<{ row: WeeklyLessonCount }>('/api/weekly-lessons', {
        contractId: contract.id,
        weekStart,
        count,
      });
      setWeekly((p) => {
        const exists = p.find((w) => w.weekStart === weekStart);
        return exists ? p.map((w) => (w.weekStart === weekStart ? res.row : w)) : [res.row, ...p];
      });
      setWeeklyOpen(false);
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function patchPayment(id: string, data: Partial<OneTimeDealPayment>) {
    try {
      const res = await api.patch<{ payment: OneTimeDealPayment }>(
        `/api/one-time-payments/${id}`,
        data,
      );
      setPayments((p) => p.map((x) => (x.id === id ? res.payment : x)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Tabs defaultValue="info" className="space-y-3">
      <TabsList>
        <TabsTrigger value="info">Карточка</TabsTrigger>
        <TabsTrigger value="lessons">Уроки ({lessons.length})</TabsTrigger>
        <TabsTrigger value="payments">Платежи ({payments.length})</TabsTrigger>
        <TabsTrigger value="invoices">Инвойсы ({invoices.length})</TabsTrigger>
        <TabsTrigger value="events">События ({events.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Данные ученика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Код" value={contract.code ?? '—'} mono />
              <Row label="Дата" value={formatFull(contract.startedAt)} />
              <Row label="Имя ученика" value={contract.studentName ?? '—'} />
              <Row label="Возраст" value={contract.age?.toString() ?? '—'} />
              <Row label="Уровень" value={contract.level ?? '—'} />
              <Row label="Контакт" value={contract.contactInfo ?? '—'} />
              <Row label="Уроков в неделю" value={contract.lessonsPerWeek?.toString() ?? '—'} />
              <Row
                label="Цена урока"
                value={contract.pricePerLesson ?? formatCurrency(contract.hourlyRate)}
              />
              <Row label="Цена заявки" value={contract.requestPrice ?? '—'} />
              <FormField label="Примечания (родитель и пр.)">
                <Textarea
                  rows={3}
                  defaultValue={[
                    contract.parentName ? `Родитель: ${contract.parentName}` : '',
                    contract.comment ?? '',
                  ]
                    .filter(Boolean)
                    .join('\n')}
                  onBlur={(e) => patchContract({ comment: e.target.value || null })}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Репетитор и оплата</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Репетитор" value={contract.tutorName} />
              <Row label="Контакт репа" value={contract.tutorContact ?? '—'} />
              <Row
                label="Дата пробного"
                value={contract.trialAt ? formatFull(contract.trialAt) : '—'}
              />
              <Row
                label="По факту (дата оплаты)"
                value={contract.paidAt ? formatFull(contract.paidAt) : '—'}
              />
              <Row
                label="Получено"
                value={contract.amountReceived ? formatCurrency(contract.amountReceived) : '—'}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="accountant"
                  checked={contract.accountantVerified}
                  onCheckedChange={(v) => patchContract({ accountantVerified: v === true })}
                />
                <label htmlFor="accountant" className="text-sm">
                  Оплата найдена (бухгалтер)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="onfop"
                  checked={contract.onFop}
                  onCheckedChange={(v) => patchContract({ onFop: v === true })}
                />
                <label htmlFor="onfop" className="text-sm">
                  На ФОП?
                </label>
              </div>
              <Row label="Комиссия" value={`${Math.round(contract.commissionRate * 100)}%`} mono />
              <div className="flex flex-wrap gap-2 pt-2">
                {contract.status === 'active' ? (
                  <Button size="sm" variant="outline" onClick={pause}>
                    На паузу
                  </Button>
                ) : null}
                {contract.status === 'paused' ? (
                  <Button size="sm" variant="outline" onClick={resume}>
                    Возобновить
                  </Button>
                ) : null}
                {contract.status === 'active' || contract.status === 'paused' ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setReplaceOpen(true)}>
                      Заменить репа
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setCloseOpen(true)}>
                      Закрыть
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="lessons">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Уроки</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setWeeklyOpen(true)}>
                Ввести «N уроков за неделю»
              </Button>
              <Button size="sm" onClick={() => setLessonOpen(true)}>
                <Plus className="h-4 w-4" /> Добавить урок
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Список уроков с датами и статусами */}
            <div>
              <h3 className="mb-2 text-sm font-medium">По датам</h3>
              {lessons.length === 0 ? (
                <p className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
                  Уроков ещё нет — внесите даты или просто число уроков на неделе.
                </p>
              ) : (
                <ul className="space-y-2">
                  {lessons.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-3 rounded border p-2">
                      <span className="font-mono text-sm">{l.date}</span>
                      <Select
                        value={l.status}
                        onValueChange={(v) => patchLesson(l.id, { status: v as LessonStatus })}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="success">Успешно</SelectItem>
                          <SelectItem value="rescheduled">Перенесено</SelectItem>
                          <SelectItem value="cancelled">Отмена</SelectItem>
                        </SelectContent>
                      </Select>
                      <StatusBadge tone={LESSON_TONE[l.status]} label={LESSON_LABEL[l.status]} />
                      <Input
                        defaultValue={l.note ?? ''}
                        placeholder="Заметка"
                        className="h-8 max-w-sm flex-1"
                        onBlur={(e) =>
                          e.target.value !== (l.note ?? '') &&
                          patchLesson(l.id, { note: e.target.value || null })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteLesson(l.id)}
                        aria-label="Удалить"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Если диспетчер не помнит даты — просто число уроков на неделе */}
            <div>
              <h3 className="mb-2 text-sm font-medium">По неделям (если без дат)</h3>
              {weekly.length === 0 ? (
                <p className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
                  Записей нет
                </p>
              ) : (
                <ul className="space-y-2">
                  {weekly.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between rounded border p-2 text-sm"
                    >
                      <div>
                        Неделя с <span className="font-mono">{w.weekStart}</span>
                      </div>
                      <div className="font-medium">{w.count} ур.</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payments">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Платежи</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
                Платежей нет
              </p>
            ) : (
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded border p-3">
                    <span className="font-mono text-sm">{formatCurrency(p.amount)}</span>
                    <Select
                      value={p.status}
                      onValueChange={(v) =>
                        patchPayment(p.id, { status: v as OneTimeDealPayment['status'] })
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Ожидание</SelectItem>
                        <SelectItem value="paid">Оплачено</SelectItem>
                        <SelectItem value="missed">Пропущено</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`acc-${p.id}`}
                        checked={p.accountantVerified}
                        onCheckedChange={(v) =>
                          patchPayment(p.id, { accountantVerified: v === true })
                        }
                      />
                      <label htmlFor={`acc-${p.id}`} className="text-xs">
                        Оплата найдена (бухгалтер)
                      </label>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {p.paidAt ? `Оплачен: ${formatFull(p.paidAt)}` : '—'}
                    </span>
                    {p.note ? (
                      <span className="text-muted-foreground text-xs">{p.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="invoices">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Инвойсы</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
                Инвойсов пока нет. Сгенерируйте после ввода уроков за неделю.
              </p>
            ) : (
              <ul className="space-y-2">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 rounded border p-3">
                    <StatusBadge
                      tone={
                        inv.status === 'paid'
                          ? 'success'
                          : inv.status === 'sent'
                            ? 'info'
                            : inv.status === 'overdue'
                              ? 'danger'
                              : 'neutral'
                      }
                      label={inv.status}
                    />
                    <span className="text-muted-foreground text-xs">
                      {inv.recipient === 'client' ? 'Клиенту' : 'Репетитору'}
                    </span>
                    <span className="font-mono">
                      {formatCurrency(inv.amount)} {inv.currency}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {inv.periodStart} — {inv.periodEnd}
                    </span>
                    <span className="text-muted-foreground text-xs">срок {inv.dueDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="events">
        <Card>
          <CardContent className="pt-6">
            {events.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
                Нет событий
              </p>
            ) : (
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="rounded border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{e.kind}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatFull(e.createdAt)}
                      </span>
                    </div>
                    {e.note ? <p className="text-muted-foreground text-xs">{e.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <CloseDialog open={closeOpen} onClose={() => setCloseOpen(false)} onSubmit={closeContract} />
      <ReplaceDialog
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        onReplace={replaceTutor}
        tutors={tutors}
        currentTutorId={contract.tutorId}
      />
      <AddLessonDialog
        open={lessonOpen}
        onClose={() => setLessonOpen(false)}
        onSubmit={addLesson}
      />
      <WeeklyDialog
        open={weeklyOpen}
        onClose={() => setWeeklyOpen(false)}
        onSubmit={submitWeekly}
      />
    </Tabs>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</span>
    </div>
  );
}

function CloseDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setReason('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Закрыть контракт</DialogTitle>
          <DialogDescription>Укажите причину для истории.</DialogDescription>
        </DialogHeader>
        <FormField label="Причина" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onSubmit(reason.trim())}
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceDialog({
  open,
  onClose,
  onReplace,
  tutors,
  currentTutorId,
}: {
  open: boolean;
  onClose: () => void;
  onReplace: (tutorId: string, note: string) => void;
  tutors: Tutor[];
  currentTutorId: string;
}) {
  const [tutorId, setTutorId] = useState('');
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заменить репетитора</DialogTitle>
        </DialogHeader>
        <FormField label="Новый репетитор">
          <Select value={tutorId} onValueChange={setTutorId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tutors
                .filter((t) => t.id !== currentTutorId)
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Причина / заметка">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={!tutorId} onClick={() => onReplace(tutorId, note)}>
            Заменить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddLessonDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (date: string, status: LessonStatus, note: string | null) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<LessonStatus>('success');
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить урок</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Дата" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Статус">
            <Select value={status} onValueChange={(v) => setStatus(v as LessonStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="success">Успешно</SelectItem>
                <SelectItem value="rescheduled">Перенесено</SelectItem>
                <SelectItem value="cancelled">Отмена</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Заметка">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onSubmit(date, status, note.trim() || null)}>Добавить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WeeklyDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (weekStart: string, count: number) => void;
}) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const [week, setWeek] = useState(monday.toISOString().slice(0, 10));
  const [count, setCount] = useState(2);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ввести количество уроков</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Неделя (понедельник)" required>
            <Input type="date" value={week} onChange={(e) => setWeek(e.target.value)} />
          </FormField>
          <FormField label="Количество уроков" required>
            <Input
              type="number"
              min={0}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 0)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onSubmit(week, count)}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
