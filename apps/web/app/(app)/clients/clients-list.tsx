'use client';

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ClientWithContacts, Role } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

interface Props {
  initial: ClientWithContacts[];
  dispatchers: { id: string; name: string }[];
  role: Role;
}

export function ClientsList({ initial, dispatchers, role }: Props) {
  const [rows, setRows] = useState<ClientWithContacts[]>(initial);
  const [q, setQ] = useState('');
  const [opened, setOpened] = useState<ClientWithContacts | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.phone ?? '').includes(needle),
    );
  }, [rows, q]);

  async function createClient(data: {
    name: string;
    phone: string | null;
    note: string | null;
  }) {
    try {
      const res = await api.post<{ client: ClientWithContacts }>('/api/clients', {
        ...data,
        dispatcherId: null,
        contacts: data.phone ? [{ kind: 'phone', value: data.phone, primary: true }] : [],
      });
      setRows((p) => [res.client, ...p]);
      setCreating(false);
      toast.success('Клиент создан');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        toast.error('Клиент с таким телефоном уже существует');
      } else {
        toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle>Все клиенты</CardTitle>
          <Input
            placeholder="Поиск по имени или телефону…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-72"
          />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Клиент
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          getRowId={(c) => c.id}
          rows={filtered}
          onRowClick={(c) => setOpened(c)}
          emptyTitle="Клиенты не найдены"
          columns={[
            {
              key: 'name',
              header: 'Имя',
              cell: (c) => <span className="font-medium">{c.name}</span>,
            },
            {
              key: 'phone',
              header: 'Телефон',
              cell: (c) => (c.phone ? <span className="font-mono">{c.phone}</span> : '—'),
            },
            {
              key: 'contacts',
              header: 'Контакты',
              cell: (c) => (
                <div className="flex flex-wrap gap-1">
                  {c.contacts.map((x) => (
                    <StatusBadge key={x.id} tone="neutral" label={`${x.kind}: ${x.value}`} />
                  ))}
                </div>
              ),
            },
            {
              key: 'dispatcher',
              header: 'Диспетчер',
              cell: (c) => {
                const d = dispatchers.find((x) => x.id === c.dispatcherId);
                return d ? (
                  d.name
                ) : (
                  <StatusBadge tone="warning" label="Не назначен" />
                );
              },
            },
          ]}
        />
      </CardContent>

      <ClientDetailsDialog
        client={opened}
        dispatchers={dispatchers}
        role={role}
        onClose={() => setOpened(null)}
        onUpdate={(next) =>
          setRows((p) => p.map((x) => (x.id === next.id ? { ...x, ...next } : x)))
        }
      />
      <CreateClientDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={createClient}
      />
    </Card>
  );
}

function ClientDetailsDialog({
  client,
  dispatchers,
  role,
  onClose,
  onUpdate,
}: {
  client: ClientWithContacts | null;
  dispatchers: { id: string; name: string }[];
  role: Role;
  onClose: () => void;
  onUpdate: (c: ClientWithContacts) => void;
}) {
  if (!client) return null;
  const current = client;

  async function patch(data: { name?: string; note?: string | null; dispatcherId?: string | null }) {
    try {
      const res = await api.patch<{ client: ClientWithContacts }>(
        `/api/clients/${current.id}`,
        data,
      );
      onUpdate({ ...current, ...res.client });
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Dialog open={client !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Карточка</TabsTrigger>
            <TabsTrigger value="contacts">Контакты</TabsTrigger>
            <TabsTrigger value="requests">Заявки</TabsTrigger>
            <TabsTrigger value="contracts">Контракты</TabsTrigger>
            <TabsTrigger value="invoices">Инвойсы</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-3">
            <FormField label="Имя">
              <Input
                defaultValue={client.name}
                onBlur={(e) => {
                  if (e.target.value !== client.name) patch({ name: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Заметка">
              <Textarea
                defaultValue={client.note ?? ''}
                onBlur={(e) => patch({ note: e.target.value || null })}
              />
            </FormField>
            {role === 'admin' ? (
              <FormField label="Диспетчер">
                <Select
                  value={client.dispatcherId ?? ''}
                  onValueChange={(v) => patch({ dispatcherId: v === '' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Не назначен" />
                  </SelectTrigger>
                  <SelectContent>
                    {dispatchers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}
          </TabsContent>
          <TabsContent value="contacts">
            <ul className="space-y-1 text-sm">
              {client.contacts.length === 0 ? (
                <li className="text-muted-foreground">Нет контактов</li>
              ) : null}
              {client.contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.kind}
                    </div>
                    <div className="font-mono">{c.value}</div>
                  </div>
                  {c.primary ? <StatusBadge tone="info" label="Основной" /> : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Полный CRUD контактов — в FE-4 (Inbox использует эти контакты как источник каналов).
            </p>
          </TabsContent>
          <TabsContent value="requests">
            <p className="text-sm text-muted-foreground">Заявки появятся на этапе FE-5.</p>
          </TabsContent>
          <TabsContent value="contracts">
            <p className="text-sm text-muted-foreground">Контракты появятся на этапе FE-6.</p>
          </TabsContent>
          <TabsContent value="invoices">
            <p className="text-sm text-muted-foreground">Инвойсы появятся на этапе FE-7.</p>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateClientDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { name: string; phone: string | null; note: string | null }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [checking, setChecking] = useState(false);
  const [dup, setDup] = useState<string | null>(null);

  function reset() {
    setName('');
    setPhone('');
    setNote('');
    setDup(null);
  }

  async function checkDuplicate(value: string) {
    if (!value || value.length < 5) {
      setDup(null);
      return;
    }
    setChecking(true);
    try {
      const res = await api.get<{ duplicate: boolean; client?: { id: string; name: string } }>(
        `/api/clients/check-duplicate?phone=${encodeURIComponent(value)}`,
      );
      setDup(res.duplicate && res.client ? res.client.name : null);
    } catch {
      setDup(null);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Dialog
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
          <DialogTitle>Новый клиент</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Имя" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField
            label="Телефон"
            description="Проверка дубля по нормализованному номеру"
            error={dup ? `Дубль: ${dup}` : undefined}
          >
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                checkDuplicate(e.target.value);
              }}
            />
          </FormField>
          <FormField label="Заметка">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!name.trim() || checking || dup !== null}
            onClick={() => {
              onCreate({
                name: name.trim(),
                phone: phone.trim() || null,
                note: note.trim() || null,
              });
              reset();
            }}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
