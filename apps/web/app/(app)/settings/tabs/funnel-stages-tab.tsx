'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { FunnelStage, Script } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ColorPicker,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SortableList,
  Switch,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';

interface Props {
  initial: FunnelStage[];
  scripts: Script[];
}

export function FunnelStagesTab({ initial, scripts }: Props) {
  const [stages, setStages] = useState<FunnelStage[]>(initial);

  async function saveStage(id: string, patch: Partial<FunnelStage>) {
    try {
      const res = await api.patch<{ stage: FunnelStage }>(`/api/funnel-stages/${id}`, patch);
      setStages((p) => p.map((s) => (s.id === id ? res.stage : s)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function reorder(next: FunnelStage[]) {
    setStages(next);
    try {
      const res = await api.post<{ items: FunnelStage[] }>('/api/funnel-stages/reorder', {
        order: next.map((s) => s.id),
      });
      setStages(res.items);
    } catch (err) {
      setStages(stages);
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function removeStage(id: string) {
    if (!confirm('Удалить этап?')) return;
    try {
      await api.delete(`/api/funnel-stages/${id}`);
      setStages((p) => p.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Этапы воронки</CardTitle>
        <p className="text-sm text-muted-foreground">
          Порядок, цвет, SLA, привязанный скрипт. Stage machine проверяет переходы по kind.
        </p>
      </CardHeader>
      <CardContent>
        <SortableList
          items={stages}
          onReorder={reorder}
          renderItem={(s) => (
            <div className="grid grid-cols-[1fr,110px,160px,180px,auto] items-center gap-3">
              <div className="min-w-0">
                <Input
                  defaultValue={s.name}
                  onBlur={(e) => {
                    if (e.target.value !== s.name) saveStage(s.id, { name: e.target.value });
                  }}
                  className="h-9"
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{s.kind}</span>
                  {s.terminal ? ' · терминальный' : ''}
                </div>
              </div>
              <ColorPicker
                value={s.color}
                onChange={(color) => saveStage(s.id, { color })}
              />
              <FormField label="SLA (мин)">
                <Input
                  type="number"
                  min={0}
                  defaultValue={s.slaMinutes ?? ''}
                  placeholder="без SLA"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const next = v === '' ? null : Number(v);
                    saveStage(s.id, { slaMinutes: next });
                  }}
                  className="h-9"
                />
              </FormField>
              <FormField label="Скрипт">
                <Select
                  value={s.scriptId ?? ''}
                  onValueChange={(v) => saveStage(s.id, { scriptId: v === '' ? null : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="не выбран" />
                  </SelectTrigger>
                  <SelectContent>
                    {scripts.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Terminal
                  <Switch
                    checked={s.terminal}
                    onCheckedChange={(checked) => saveStage(s.id, { terminal: checked })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStage(s.id)}
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
