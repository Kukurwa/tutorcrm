'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { Tutor, TutorStatus } from '@tutorcrm/contracts';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Label,
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

export interface TutorStats {
  successTrials: number;
  totalTrials: number;
  successRate: number | null;
  activeContracts: number;
  totalContracts: number;
  closedContracts: number;
  oneTimeGiven: number;
}

export interface TutorWithStats extends Tutor {
  stats: TutorStats;
}

interface Props {
  initial: TutorWithStats[];
  subjects: { id: string; name: string }[];
}

const STATUS_TONE: Record<TutorStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  paused: 'warning',
  blocked: 'danger',
};

const STATUS_LABEL: Record<TutorStatus, string> = {
  active: 'Активен',
  paused: 'Приостановлен',
  blocked: 'Заблокирован',
};

const emptyStats: TutorStats = {
  successTrials: 0,
  totalTrials: 0,
  successRate: null,
  activeContracts: 0,
  totalContracts: 0,
  closedContracts: 0,
  oneTimeGiven: 0,
};

export function TutorsList({ initial, subjects }: Props) {
  const [tutors, setTutors] = useState<TutorWithStats[]>(initial);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Tutor | null>(null);

  async function create(t: Omit<Tutor, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const res = await api.post<{ tutor: Tutor }>('/api/tutors', t);
      setTutors((p) =>
        [...p, { ...res.tutor, stats: emptyStats }].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCreating(false);
      toast.success('Репетитор добавлен');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function update(id: string, patch: Partial<Tutor>) {
    try {
      const res = await api.patch<{ tutor: Tutor }>(`/api/tutors/${id}`, patch);
      setTutors((p) => p.map((t) => (t.id === id ? { ...res.tutor, stats: t.stats } : t)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>База репетиторов</CardTitle>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          getRowId={(t) => t.id}
          rows={tutors}
          onRowClick={(t) => setEditing(t)}
          emptyTitle="Нет репетиторов"
          columns={[
            {
              key: 'name',
              header: 'Имя',
              cell: (t) => (
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {t.phone ?? 'без телефона'} · опыт {t.experienceYears} лет · {t.hourlyRate}₴/ч
                  </div>
                </div>
              ),
            },
            {
              key: 'subjects',
              header: 'Предметы',
              cell: (t) => (
                <div className="flex flex-wrap gap-1">
                  {t.subjects.map((sid) => {
                    const s = subjects.find((x) => x.id === sid);
                    return s ? (
                      <span key={sid} className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        {s.name}
                      </span>
                    ) : null;
                  })}
                </div>
              ),
            },
            {
              key: 'trials',
              header: 'Пробные',
              align: 'center',
              cell: (t) => (
                <div className="text-sm">
                  <span className="font-semibold text-emerald-600">{t.stats.successTrials}</span>
                  <span className="text-muted-foreground">/{t.stats.totalTrials}</span>
                  {t.stats.successRate !== null ? (
                    <div className="text-muted-foreground text-xs">
                      {t.stats.successRate}% успех
                    </div>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'contracts',
              header: 'На контракте',
              align: 'center',
              cell: (t) => (
                <div className="text-sm">
                  <span className="font-semibold">{t.stats.activeContracts}</span>
                  {t.stats.closedContracts > 0 ? (
                    <div className="text-muted-foreground text-xs">
                      всего {t.stats.totalContracts}
                    </div>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'onetime',
              header: 'Разовых',
              align: 'center',
              cell: (t) => <span className="text-sm font-semibold">{t.stats.oneTimeGiven}</span>,
            },
            {
              key: 'status',
              header: 'Статус',
              cell: (t) => (
                <StatusBadge tone={STATUS_TONE[t.status]} label={STATUS_LABEL[t.status]} />
              ),
            },
          ]}
        />
      </CardContent>
      <TutorDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(v) => create(v)}
        subjects={subjects}
      />
      <TutorDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          if (editing) update(editing.id, v);
          setEditing(null);
        }}
        subjects={subjects}
        defaults={editing ?? undefined}
      />
    </Card>
  );
}

function TutorDialog({
  open,
  onClose,
  onSubmit,
  subjects,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (t: Omit<Tutor, 'id' | 'createdAt' | 'updatedAt'>) => void;
  subjects: { id: string; name: string }[];
  defaults?: Tutor;
}) {
  const [name, setName] = useState(defaults?.name ?? '');
  const [phone, setPhone] = useState(defaults?.phone ?? '');
  const [experience, setExperience] = useState(defaults?.experienceYears ?? 0);
  const [rate, setRate] = useState(defaults?.hourlyRate ?? 0);
  const [note, setNote] = useState(defaults?.note ?? '');
  const [status, setStatus] = useState<TutorStatus>(defaults?.status ?? 'active');
  const [picked, setPicked] = useState<string[]>(defaults?.subjects ?? []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{defaults ? 'Редактирование' : 'Новый репетитор'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Имя" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Телефон">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="Опыт (лет)">
              <Input
                type="number"
                min={0}
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value) || 0)}
              />
            </FormField>
            <FormField label="Ставка /ч">
              <Input
                type="number"
                min={0}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 0)}
              />
            </FormField>
          </div>
          <FormField label="Предметы">
            <div className="flex flex-wrap gap-3">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={picked.includes(s.id)}
                    onCheckedChange={(checked) => {
                      setPicked((p) => (checked ? [...p, s.id] : p.filter((x) => x !== s.id)));
                    }}
                  />
                  <Label>{s.name}</Label>
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="Статус">
            <Select value={status} onValueChange={(v) => setStatus(v as TutorStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="paused">Приостановлен</SelectItem>
                <SelectItem value="blocked">Заблокирован</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Заметка">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                phone: phone.trim() || null,
                experienceYears: experience,
                hourlyRate: rate,
                note: note.trim() || null,
                status,
                subjects: picked,
              })
            }
          >
            {defaults ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
