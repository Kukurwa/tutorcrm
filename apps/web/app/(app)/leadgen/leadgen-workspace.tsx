'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { Lead, LeadStatus, Role } from '@tutorcrm/contracts';
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
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { formatFull } from '@/lib/format';

interface Props {
  initial: Lead[];
  dispatchers: { id: string; name: string }[];
  role: Role;
}

const STATUS_TONE: Record<LeadStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  new: 'warning',
  assigned: 'info',
  converted: 'success',
  rejected: 'danger',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Новый',
  assigned: 'Назначен',
  converted: 'В клиентах',
  rejected: 'Отказ',
};

export function LeadGenWorkspace({ initial, dispatchers, role }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [creating, setCreating] = useState(false);

  async function createLead(data: {
    clientName: string;
    phone: string | null;
    subject: string | null;
    note: string | null;
  }) {
    try {
      const res = await api.post<{ lead: Lead; duplicateClientId: string | null }>(
        '/api/leads',
        data,
      );
      setLeads((p) => [res.lead, ...p]);
      setCreating(false);
      if (res.duplicateClientId) {
        toast.warning('Найден дубль клиента — лид привязан к существующему клиенту');
      } else {
        toast.success('Лид создан');
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function assign(id: string, dispatcherId: string) {
    try {
      const res = await api.post<{ lead: Lead }>(`/api/leads/${id}/assign`, { dispatcherId });
      setLeads((p) => p.map((l) => (l.id === id ? res.lead : l)));
      toast.success('Назначен диспетчер');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Мои лиды</CardTitle>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Новый лид
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          getRowId={(l) => l.id}
          rows={leads}
          emptyTitle="Нет лидов"
          emptyDescription="Создайте первый — кнопка «Новый лид»."
          columns={[
            {
              key: 'name',
              header: 'Имя / контакт',
              cell: (l) => (
                <div>
                  <div className="font-medium">{l.clientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.phone ?? '—'} · {l.subject ?? 'предмет не указан'}
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Статус',
              cell: (l) => <StatusBadge tone={STATUS_TONE[l.status]} label={STATUS_LABEL[l.status]} />,
            },
            {
              key: 'dispatcher',
              header: 'Диспетчер',
              cell: (l) => {
                const d = dispatchers.find((x) => x.id === l.dispatcherId);
                if (role !== 'admin') {
                  return d ? d.name : '—';
                }
                return (
                  <Select
                    value={l.dispatcherId ?? ''}
                    onValueChange={(v) => assign(l.id, v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Назначить" />
                    </SelectTrigger>
                    <SelectContent>
                      {dispatchers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              },
            },
            {
              key: 'created',
              header: 'Создан',
              cell: (l) => formatFull(l.createdAt),
            },
          ]}
        />
      </CardContent>

      <CreateLeadDialog open={creating} onClose={() => setCreating(false)} onCreate={createLead} />
    </Card>
  );
}

function CreateLeadDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: {
    clientName: string;
    phone: string | null;
    subject: string | null;
    note: string | null;
  }) => void;
}) {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [dupName, setDupName] = useState<string | null>(null);

  function reset() {
    setClientName('');
    setPhone('');
    setSubject('');
    setNote('');
    setDupName(null);
  }

  async function checkDup(value: string) {
    if (!value || value.length < 5) {
      setDupName(null);
      return;
    }
    try {
      const res = await api.get<{ duplicate: boolean; client?: { id: string; name: string } }>(
        `/api/clients/check-duplicate?phone=${encodeURIComponent(value)}`,
      );
      setDupName(res.duplicate && res.client ? res.client.name : null);
    } catch {
      setDupName(null);
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
          <DialogTitle>Новый лид</DialogTitle>
          <DialogDescription>
            Если номер уже есть — лид привяжется к существующему клиенту.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Имя клиента" required>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </FormField>
          <FormField
            label="Телефон"
            description={
              dupName ? (
                <span className="text-amber-600">Дубль: {dupName}. Привяжем к нему.</span>
              ) : undefined
            }
          >
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                checkDup(e.target.value);
              }}
            />
          </FormField>
          <FormField label="Предмет">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Математика, ЗНО…" />
          </FormField>
          <FormField label="Заметка">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!clientName.trim()}
            onClick={() => {
              onCreate({
                clientName: clientName.trim(),
                phone: phone.trim() || null,
                subject: subject.trim() || null,
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
