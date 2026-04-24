'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { RejectionReason } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  FormField,
  Input,
  Switch,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

export function RejectionReasonsTab({ initial }: { initial: RejectionReason[] }) {
  const [reasons, setReasons] = useState<RejectionReason[]>(initial);
  const [newLabel, setNewLabel] = useState('');

  async function add() {
    if (!newLabel.trim()) return;
    try {
      const res = await api.post<{ reason: RejectionReason }>('/api/rejection-reasons', {
        label: newLabel.trim(),
        active: true,
      });
      setReasons((p) => [...p, res.reason]);
      setNewLabel('');
      toast.success('Причина добавлена');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function toggle(r: RejectionReason) {
    try {
      const res = await api.patch<{ reason: RejectionReason }>(
        `/api/rejection-reasons/${r.id}`,
        { active: !r.active },
      );
      setReasons((p) => p.map((x) => (x.id === r.id ? res.reason : x)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/rejection-reasons/${id}`);
      setReasons((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Причины отказа</CardTitle>
        <p className="text-sm text-muted-foreground">
          Используются при переводе заявки в «Закрыт (отказ)».
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <FormField label="Добавить причину" htmlFor="new-reason" className="flex-1">
            <Input
              id="new-reason"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Например, Клиент передумал"
              onKeyDown={(e) => {
                if (e.key === 'Enter') add();
              }}
            />
          </FormField>
          <Button onClick={add} disabled={!newLabel.trim()}>
            <Plus className="h-4 w-4" /> Добавить
          </Button>
        </div>
        <DataTable
          getRowId={(r) => r.id}
          rows={reasons}
          emptyTitle="Нет причин"
          columns={[
            { key: 'label', header: 'Причина', cell: (r) => r.label },
            {
              key: 'active',
              header: 'Активна',
              cell: (r) => <Switch checked={r.active} onCheckedChange={() => toggle(r)} />,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              cell: (r) => (
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
