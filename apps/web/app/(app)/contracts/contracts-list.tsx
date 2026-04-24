'use client';

import { useEffect, useState } from 'react';

import type {
  Contract,
  ContractEvent,
  ContractStatus,
  Invoice,
  Tutor,
  WeeklyLessonCount,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { formatCurrency, formatFull } from '@/lib/format';

const STATUS_TONE: Record<ContractStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  closed_won: 'neutral',
  closed_lost: 'danger',
};

const STATUS_LABEL: Record<ContractStatus, string> = {
  active: 'Активен',
  paused: 'Пауза',
  closed_won: 'Завершён',
  closed_lost: 'Отказ',
};

export function ContractsList({
  initial,
  tutors,
}: {
  initial: Contract[];
  tutors: Tutor[];
}) {
  const [rows, setRows] = useState<Contract[]>(initial);
  const [opened, setOpened] = useState<Contract | null>(null);

  function upsertRow(c: Contract) {
    setRows((p) => p.map((x) => (x.id === c.id ? c : x)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Все контракты</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          getRowId={(c) => c.id}
          rows={rows}
          onRowClick={(c) => setOpened(c)}
          emptyTitle="Нет контрактов"
          columns={[
            {
              key: 'client',
              header: 'Клиент',
              cell: (c) => (
                <div>
                  <div className="font-medium">{c.clientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.subjectName ?? '—'} · репетитор: {c.tutorName}
                  </div>
                </div>
              ),
            },
            {
              key: 'rate',
              header: 'Ставка',
              align: 'right',
              cell: (c) => <span className="font-mono text-sm">{formatCurrency(c.hourlyRate)}</span>,
            },
            {
              key: 'commission',
              header: 'Комиссия',
              align: 'right',
              cell: (c) => (
                <span className="font-mono text-sm">{Math.round(c.commissionRate * 100)}%</span>
              ),
            },
            {
              key: 'status',
              header: 'Статус',
              cell: (c) => <StatusBadge tone={STATUS_TONE[c.status]} label={STATUS_LABEL[c.status]} />,
            },
            {
              key: 'started',
              header: 'Активен с',
              cell: (c) => formatFull(c.startedAt),
            },
          ]}
        />
      </CardContent>
      <ContractDialog
        contract={opened}
        tutors={tutors}
        onClose={() => setOpened(null)}
        onUpdate={upsertRow}
      />
    </Card>
  );
}

function ContractDialog({
  contract,
  tutors,
  onClose,
  onUpdate,
}: {
  contract: Contract | null;
  tutors: Tutor[];
  onClose: () => void;
  onUpdate: (c: Contract) => void;
}) {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [weekly, setWeekly] = useState<WeeklyLessonCount[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [closeOpen, setCloseOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);

  useEffect(() => {
    if (!contract) return;
    (async () => {
      try {
        const [res, inv] = await Promise.all([
          api.get<{
            contract: Contract;
            events: ContractEvent[];
            weeklyCounts: WeeklyLessonCount[];
          }>(`/api/contracts/${contract.id}`),
          api.get<{ items: Invoice[] }>(`/api/invoices?contractId=${contract.id}`),
        ]);
        setEvents(res.events);
        setWeekly(res.weeklyCounts);
        setInvoices(inv.items);
      } catch {
        /* noop */
      }
    })();
  }, [contract]);

  if (!contract) return null;
  const current = contract;

  async function pause() {
    try {
      const res = await api.post<{ contract: Contract; event: ContractEvent }>(
        `/api/contracts/${current.id}/pause`,
        { note: 'Поставлено на паузу' },
      );
      onUpdate(res.contract);
      setEvents((p) => [res.event, ...p]);
      toast.success('На паузе');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function resume() {
    try {
      const res = await api.post<{ contract: Contract; event: ContractEvent }>(
        `/api/contracts/${current.id}/resume`,
      );
      onUpdate(res.contract);
      setEvents((p) => [res.event, ...p]);
      toast.success('Возобновлено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function closeContract(reason: string) {
    try {
      const res = await api.post<{ contract: Contract; event: ContractEvent }>(
        `/api/contracts/${current.id}/close`,
        { reason },
      );
      onUpdate(res.contract);
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
        `/api/contracts/${current.id}/replace-tutor`,
        { tutorId, note },
      );
      onUpdate(res.contract);
      setEvents((p) => [res.event, ...p]);
      setReplaceOpen(false);
      toast.success('Репетитор заменён');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function generateInvoices(weeklyCountId: string) {
    try {
      const res = await api.post<{ client: Invoice; tutor: Invoice }>('/api/invoices', {
        contractId: current.id,
        weeklyCountId,
      });
      setInvoices((p) => [res.client, res.tutor, ...p]);
      toast.success('Инвойсы сгенерированы');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function invoiceAction(id: string, action: 'send' | 'mark_paid' | 'mark_overdue' | 'skip') {
    try {
      const res = await api.post<{ invoice: Invoice }>(
        `/api/invoices/${id}/transition`,
        { action },
      );
      setInvoices((p) => p.map((x) => (x.id === id ? res.invoice : x)));
      toast.success('Статус обновлён');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function updateInvoiceAmount(id: string, amount: number) {
    try {
      const res = await api.patch<{ invoice: Invoice }>(`/api/invoices/${id}`, { amount });
      setInvoices((p) => p.map((x) => (x.id === id ? res.invoice : x)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function submitWeekly(weekStart: string, count: number) {
    try {
      const res = await api.post<{ row: WeeklyLessonCount }>('/api/weekly-lessons', {
        contractId: current.id,
        weekStart,
        count,
      });
      setWeekly((p) => {
        const existing = p.find((w) => w.weekStart === weekStart);
        return existing ? p.map((w) => (w.weekStart === weekStart ? res.row : w)) : [res.row, ...p];
      });
      setWeeklyOpen(false);
      toast.success('Количество уроков сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Dialog open={current !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {current.clientName} · {current.tutorName}
          </DialogTitle>
          <DialogDescription>
            {current.subjectName ?? 'без предмета'} · ставка{' '}
            {formatCurrency(current.hourlyRate)} · комиссия{' '}
            {Math.round(current.commissionRate * 100)}%
            <StatusBadge
              className="ml-2"
              tone={STATUS_TONE[current.status]}
              label={STATUS_LABEL[current.status]}
            />
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Данные</TabsTrigger>
            <TabsTrigger value="weekly">Уроки ({weekly.length})</TabsTrigger>
            <TabsTrigger value="events">События ({events.length})</TabsTrigger>
            <TabsTrigger value="invoices">Инвойсы</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {current.status === 'active' ? (
                <Button size="sm" variant="outline" onClick={pause}>
                  Поставить на паузу
                </Button>
              ) : null}
              {current.status === 'paused' ? (
                <Button size="sm" variant="outline" onClick={resume}>
                  Возобновить
                </Button>
              ) : null}
              {current.status === 'active' || current.status === 'paused' ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setReplaceOpen(true)}>
                    Заменить репетитора
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setCloseOpen(true)}>
                    Закрыть контракт
                  </Button>
                </>
              ) : null}
            </div>
          </TabsContent>
          <TabsContent value="weekly">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Вводите количество уроков раз в неделю. На основе этих цифр генерируются инвойсы (FE-7).
              </p>
              <Button size="sm" onClick={() => setWeeklyOpen(true)}>
                Ввести за неделю
              </Button>
            </div>
            <ul className="mt-3 space-y-2">
              {weekly.length === 0 ? (
                <p className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Нет записей
                </p>
              ) : null}
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
          </TabsContent>
          <TabsContent value="events">
            <ul className="space-y-2">
              {events.length === 0 ? (
                <p className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Нет событий
                </p>
              ) : null}
              {events.map((e) => (
                <li key={e.id} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{e.kind}</span>
                    <span className="text-xs text-muted-foreground">{formatFull(e.createdAt)}</span>
                  </div>
                  {e.note ? <p className="text-xs text-muted-foreground">{e.note}</p> : null}
                </li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="invoices" className="space-y-3">
            {weekly.length === 0 ? (
              <p className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                Сначала внесите количество уроков за неделю.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weekly.map((w) => {
                  const hasInvoices = invoices.some((i) => i.weeklyCountId === w.id);
                  return (
                    <Button
                      key={w.id}
                      variant="outline"
                      size="sm"
                      disabled={hasInvoices}
                      onClick={() => generateInvoices(w.id)}
                    >
                      {hasInvoices ? '✓' : '+'} Сгенерировать за {w.weekStart} ({w.count} ур.)
                    </Button>
                  );
                })}
              </div>
            )}
            <ul className="space-y-2">
              {invoices.length === 0 ? (
                <li className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Инвойсов ещё нет
                </li>
              ) : null}
              {invoices.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  onAction={(a) => invoiceAction(inv.id, a)}
                  onAmount={(a) => updateInvoiceAmount(inv.id, a)}
                />
              ))}
            </ul>
          </TabsContent>
        </Tabs>

        <CloseDialog open={closeOpen} onClose={() => setCloseOpen(false)} onClose2={closeContract} />
        <ReplaceDialog
          open={replaceOpen}
          onClose={() => setReplaceOpen(false)}
          onReplace={replaceTutor}
          tutors={tutors}
          currentTutorId={current.tutorId}
        />
        <WeeklyDialog
          open={weeklyOpen}
          onClose={() => setWeeklyOpen(false)}
          onSubmit={submitWeekly}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({
  open,
  onClose,
  onClose2,
}: {
  open: boolean;
  onClose: () => void;
  onClose2: (reason: string) => void;
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
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => onClose2(reason.trim())}>
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
  const [tutorId, setTutorId] = useState(tutors[0]?.id ?? '');
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
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button disabled={!tutorId} onClick={() => onReplace(tutorId, note)}>
            Заменить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceRow({
  invoice,
  onAction,
  onAmount,
}: {
  invoice: Invoice;
  onAction: (a: 'send' | 'mark_paid' | 'mark_overdue' | 'skip') => void;
  onAmount: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(invoice.amount);
  const [dirty, setDirty] = useState(false);

  const tone =
    invoice.status === 'paid'
      ? 'success'
      : invoice.status === 'sent'
        ? 'info'
        : invoice.status === 'overdue'
          ? 'danger'
          : invoice.status === 'skipped'
            ? 'neutral'
            : 'warning';
  const label =
    invoice.status === 'paid'
      ? 'Оплачен'
      : invoice.status === 'sent'
        ? 'Отправлен'
        : invoice.status === 'overdue'
          ? 'Просрочен'
          : invoice.status === 'skipped'
            ? 'Пропущен'
            : 'Черновик';

  return (
    <li className="rounded border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={tone} label={label} />
        <span className="text-xs text-muted-foreground">
          {invoice.recipient === 'client' ? 'Клиенту' : 'Репетитору'}
        </span>
        <span className="text-xs text-muted-foreground">
          Период: {invoice.periodStart} — {invoice.periodEnd}
        </span>
        <span className="text-xs text-muted-foreground">
          Срок: {invoice.dueDate}
        </span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(Number(e.target.value) || 0);
              setDirty(true);
            }}
            className="h-8 w-28 font-mono"
            disabled={invoice.status === 'paid' || invoice.status === 'skipped'}
          />
          <span className="text-xs text-muted-foreground">{invoice.currency}</span>
          {dirty ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onAmount(amount);
                setDirty(false);
              }}
            >
              Сохр.
            </Button>
          ) : null}
        </div>
        <div className="ml-auto flex gap-1">
          {invoice.status === 'draft' ? (
            <Button size="sm" variant="outline" onClick={() => onAction('send')}>
              Отправить
            </Button>
          ) : null}
          {(invoice.status === 'sent' || invoice.status === 'overdue') ? (
            <Button size="sm" variant="outline" onClick={() => onAction('mark_paid')}>
              Оплачен
            </Button>
          ) : null}
          {invoice.status === 'sent' ? (
            <Button size="sm" variant="ghost" onClick={() => onAction('mark_overdue')}>
              Просрочен
            </Button>
          ) : null}
          {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') ? (
            <Button size="sm" variant="ghost" onClick={() => onAction('skip')}>
              Пропустить
            </Button>
          ) : null}
        </div>
      </div>
    </li>
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
  const defaultWeek = monday.toISOString().slice(0, 10);

  const [week, setWeek] = useState(defaultWeek);
  const [count, setCount] = useState(2);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ввести количество уроков</DialogTitle>
          <DialogDescription>Понедельник выбранной недели (YYYY-MM-DD).</DialogDescription>
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
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={() => onSubmit(week, count)}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
