'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import type {
  FunnelStage,
  RejectionReason,
  Request as Req,
  RequestStageKind,
  Subject,
  Tutor,
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
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { formatFull } from '@/lib/format';

import { RequestCardDialog } from './request-card-dialog';

interface Props {
  initial: Req[];
  stages: FunnelStage[];
  reasons: RejectionReason[];
  subjects: Subject[];
  tutors: Tutor[];
  clients: { id: string; name: string; dispatcherId: string | null }[];
}

export function RequestsList({ initial, stages, reasons, subjects, tutors, clients }: Props) {
  const [rows, setRows] = useState<Req[]>(initial);
  const [creating, setCreating] = useState(false);
  const [opened, setOpened] = useState<Req | null>(null);
  const [filterStage, setFilterStage] = useState<RequestStageKind | ''>('');

  const filtered = rows.filter((r) => (filterStage ? r.stage === filterStage : true));

  async function createRequest(d: {
    clientId: string;
    subjectId: string | null;
    dealType: 'contract' | 'one_time';
    description: string;
    budgetFrom: number | null;
    budgetTo: number | null;
    schedule: string | null;
  }) {
    try {
      const res = await api.post<{ request: Req }>('/api/requests', d);
      setRows((p) => [res.request, ...p]);
      setCreating(false);
      toast.success('Заявка создана');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle>Все заявки</CardTitle>
          <Select
            value={filterStage === '' ? '__all' : filterStage}
            onValueChange={(v) =>
              setFilterStage(v === '__all' ? '' : (v as RequestStageKind))
            }
          >
            <SelectTrigger className="h-9 w-56">
              <SelectValue placeholder="Все стадии" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Все стадии</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.kind} value={s.kind}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Заявка
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          getRowId={(r) => r.id}
          rows={filtered}
          onRowClick={(r) => setOpened(r)}
          emptyTitle="Нет заявок"
          columns={[
            {
              key: 'client',
              header: 'Клиент',
              cell: (r) => (
                <div>
                  <div className="font-medium">{r.clientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.subjectName ?? 'без предмета'} · {r.dealType === 'contract' ? 'контракт' : 'разовый'}
                  </div>
                </div>
              ),
            },
            {
              key: 'stage',
              header: 'Стадия',
              cell: (r) => {
                const s = stages.find((x) => x.kind === r.stage);
                return s ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: `${s.color}26`,
                      color: s.color,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                ) : (
                  r.stage
                );
              },
            },
            {
              key: 'budget',
              header: 'Бюджет',
              align: 'right',
              cell: (r) => {
                if (!r.budgetFrom && !r.budgetTo) return <span className="text-muted-foreground">—</span>;
                return (
                  <span className="font-mono text-xs">
                    {r.budgetFrom ?? '—'}–{r.budgetTo ?? '—'}
                  </span>
                );
              },
            },
            {
              key: 'channels',
              header: 'Каналы',
              cell: (r) =>
                r.publishedChannels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {r.publishedChannels.map((c) => (
                      <StatusBadge key={c} tone="info" label={c} className="text-[10px]" />
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">не опубликована</span>
                ),
            },
            {
              key: 'updated',
              header: 'Обновлена',
              cell: (r) => formatFull(r.updatedAt),
            },
          ]}
        />
      </CardContent>

      <CreateRequestDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={createRequest}
        clients={clients}
        subjects={subjects}
      />
      <RequestCardDialog
        request={opened}
        onClose={() => setOpened(null)}
        onUpdate={(next) => setRows((p) => p.map((x) => (x.id === next.id ? next : x)))}
        stages={stages}
        reasons={reasons}
        tutors={tutors}
      />
    </Card>
  );
}

function CreateRequestDialog({
  open,
  onClose,
  onCreate,
  clients,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: {
    clientId: string;
    subjectId: string | null;
    dealType: 'contract' | 'one_time';
    description: string;
    budgetFrom: number | null;
    budgetTo: number | null;
    schedule: string | null;
  }) => void;
  clients: { id: string; name: string; dispatcherId: string | null }[];
  subjects: Subject[];
}) {
  const [clientId, setClientId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string | ''>('');
  const [dealType, setDealType] = useState<'contract' | 'one_time'>('contract');
  const [description, setDescription] = useState('');
  const [budgetFrom, setBudgetFrom] = useState('');
  const [budgetTo, setBudgetTo] = useState('');
  const [schedule, setSchedule] = useState('');

  function reset() {
    setClientId('');
    setSubjectId('');
    setDealType('contract');
    setDescription('');
    setBudgetFrom('');
    setBudgetTo('');
    setSchedule('');
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Новая заявка</DialogTitle>
          <DialogDescription>
            Заявка создаётся на выбранного клиента. Стадия стартовая — «Заявка сформирована».
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Клиент" required>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите клиента" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Предмет">
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Тип сделки">
              <Select
                value={dealType}
                onValueChange={(v) => setDealType(v as 'contract' | 'one_time')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Контрактный</SelectItem>
                  <SelectItem value="one_time">Разовый</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Описание" required>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Цель, уровень, задачи…"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Бюджет от, /ч">
              <Input
                type="number"
                min={0}
                value={budgetFrom}
                onChange={(e) => setBudgetFrom(e.target.value)}
              />
            </FormField>
            <FormField label="Бюджет до, /ч">
              <Input
                type="number"
                min={0}
                value={budgetTo}
                onChange={(e) => setBudgetTo(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Расписание">
            <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            disabled={!clientId || !description.trim()}
            onClick={() => {
              onCreate({
                clientId,
                subjectId: subjectId === '' ? null : subjectId,
                dealType,
                description: description.trim(),
                budgetFrom: budgetFrom === '' ? null : Number(budgetFrom),
                budgetTo: budgetTo === '' ? null : Number(budgetTo),
                schedule: schedule.trim() || null,
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
