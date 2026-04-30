'use client';

import { useMemo, useState } from 'react';

import type { Lead } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
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
import { formatRelativeTime } from '@/lib/format';

interface Props {
  initialLeads: Lead[];
  dispatchers: { id: string; name: string }[];
}

const STATUS_TONE: Record<Lead['status'], 'info' | 'warning' | 'success' | 'danger'> = {
  new: 'warning',
  assigned: 'info',
  converted: 'success',
  rejected: 'danger',
};

const STATUS_LABEL: Record<Lead['status'], string> = {
  new: 'Новый',
  assigned: 'Назначен',
  converted: 'Конверт.',
  rejected: 'Отказ',
};

export function LeadgenView({ initialLeads, dispatchers }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  // null = авто-распределение (фронт-флаг), строка = выбранный диспетчер
  const [dispatcherId, setDispatcherId] = useState<string>('__auto');

  async function submit() {
    if (!text.trim() || !contact.trim()) return;
    const isAuto = dispatcherId === '__auto';
    try {
      const res = await api.post<{ lead: Lead }>('/api/leads', {
        text: text.trim(),
        contact: contact.trim(),
        dispatcherId: isAuto ? null : dispatcherId,
        autoAssign: isAuto,
      });
      setLeads((p) => [res.lead, ...p]);
      setText('');
      setContact('');
      toast.success('Лид создан');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  const stats = useMemo(() => {
    return {
      total: leads.length,
      assigned: leads.filter((l) => l.status === 'assigned' || l.status === 'converted').length,
      new: leads.filter((l) => l.status === 'new').length,
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Всего лидов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Назначены</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.assigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ждут диспетчера</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.new}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Новый лид</CardTitle>
          <CardDescription>
            Просто напишите, что хочет клиент, и контакт. Можно назначить диспетчера вручную или
            включить автораспределение.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField label="Текст" required>
            <Textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Что нужно: предмет, уровень, расписание, особенности…"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Контакт" required>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Телефон, @username, email"
              />
            </FormField>
            <FormField label="Диспетчер">
              <Select value={dispatcherId} onValueChange={setDispatcherId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto">Авто-распределение</SelectItem>
                  {dispatchers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <Button disabled={!text.trim() || !contact.trim()} onClick={submit}>
            Создать лид
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Мои лиды</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            getRowId={(l) => l.id}
            rows={leads}
            emptyTitle="Лидов пока нет"
            columns={[
              {
                key: 'text',
                header: 'Текст',
                cell: (l) => <div className="line-clamp-2 max-w-md text-sm">{l.text}</div>,
              },
              {
                key: 'contact',
                header: 'Контакт',
                cell: (l) => <span className="text-sm">{l.contact}</span>,
              },
              {
                key: 'status',
                header: 'Статус',
                cell: (l) => (
                  <div className="flex items-center gap-1">
                    <StatusBadge tone={STATUS_TONE[l.status]} label={STATUS_LABEL[l.status]} />
                    {l.autoAssigned ? (
                      <StatusBadge tone="neutral" label="auto" className="text-[10px]" />
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'dispatcher',
                header: 'Диспетчер',
                cell: (l) => {
                  if (!l.dispatcherId) {
                    return <span className="text-muted-foreground text-xs">—</span>;
                  }
                  const d = dispatchers.find((x) => x.id === l.dispatcherId);
                  return <span className="text-sm">{d?.name ?? l.dispatcherId}</span>;
                },
              },
              {
                key: 'created',
                header: 'Создан',
                cell: (l) => formatRelativeTime(l.createdAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
