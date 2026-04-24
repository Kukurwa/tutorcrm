'use client';

import { useState } from 'react';

import type { AutoActionKey, SystemSettings } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const AUTO_ACTIONS: { key: AutoActionKey; label: string; description: string }[] = [
  {
    key: 'auto_assign_dispatcher_on_new_dialog',
    label: 'Автоназначение диспетчера на новый диалог',
    description: 'По round-robin или равномерной нагрузке.',
  },
  {
    key: 'auto_publish_to_channels_on_request_ready',
    label: 'Автопубликация заявки в каналы',
    description: 'При переходе «Заявка сформирована».',
  },
  {
    key: 'auto_create_feedback_task_on_assignment',
    label: 'Автозадача «Нужен фидбек» после пробного',
    description: 'Delayed job на N часов после пробного.',
  },
  {
    key: 'auto_generate_invoices_weekly',
    label: 'Еженедельная генерация инвойсов',
    description: 'В день из настроек; создаёт пару (клиент + репетитор).',
  },
  {
    key: 'auto_mark_overdue_invoices',
    label: 'Автопомётка просроченных инвойсов',
    description: 'Инвойс → overdue + task + нотификация.',
  },
];

export function SystemSettingsTab({ initial }: { initial: SystemSettings }) {
  const [draft, setDraft] = useState<SystemSettings>(initial);

  async function save() {
    try {
      const res = await api.put<{ settings: SystemSettings }>('/api/system-settings', draft);
      setDraft(res.settings);
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Инвойсы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="День еженедельной генерации">
            <Select
              value={String(draft.invoiceWeekday)}
              onValueChange={(v) => setDraft({ ...draft, invoiceWeekday: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((w, i) => (
                  <SelectItem key={w} value={String(i)}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Срок оплаты (дней)">
            <Input
              type="number"
              min={0}
              value={draft.invoiceDueDays}
              onChange={(e) => setDraft({ ...draft, invoiceDueDays: Number(e.target.value) || 0 })}
            />
          </FormField>
          <FormField label="Валюта">
            <Select
              value={draft.currency}
              onValueChange={(v) => setDraft({ ...draft, currency: v as SystemSettings['currency'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UAH">UAH (₴)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Автодействия</CardTitle>
          <p className="text-sm text-muted-foreground">
            Включение/выключение автоматических поведений системы.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {AUTO_ACTIONS.map((a) => (
            <div
              key={a.key}
              className="flex items-start justify-between gap-4 rounded border p-3"
            >
              <div className="min-w-0">
                <Label htmlFor={a.key}>{a.label}</Label>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
              <Switch
                id={a.key}
                checked={draft.autoActions[a.key] ?? false}
                onCheckedChange={(checked) =>
                  setDraft({
                    ...draft,
                    autoActions: { ...draft.autoActions, [a.key]: checked },
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Button onClick={save}>Сохранить</Button>
      </div>
    </div>
  );
}
