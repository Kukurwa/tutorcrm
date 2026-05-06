'use client';

import { Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  FunnelStage,
  RejectionReason,
  Request as Req,
  Subject,
  Tutor,
} from '@tutorcrm/contracts';
import {
  Badge,
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
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { StagePill } from '@/components/stage-pill';
import { api, ApiClientError } from '@/lib/api-client';
import { formatFull } from '@/lib/format';

import { RequestCardDialog } from './request-card-dialog';

const HOUR_MS = 3600_000;

interface Props {
  initial: Req[];
  stages: FunnelStage[];
  reasons: RejectionReason[];
  subjects: Subject[];
  tutors: Tutor[];
  clients: { id: string; name: string; dispatcherId: string | null }[];
}

type CreateRequestPayload = {
  clientId: string;
  subjectId: string | null;
  dealType: 'contract' | 'one_time';
  description: string;
  studentName: string | null;
  age: number | null;
  grade: string | null;
  schedule: string | null;
  pricePerHour: string | null;
  requestPrice: string | null;
  extraInfo: string | null;
};

export function RequestsList({ initial, stages, reasons, subjects, tutors, clients }: Props) {
  const [rows, setRows] = useState<Req[]>(initial);
  const [creating, setCreating] = useState(false);
  const [opened, setOpened] = useState<Req | null>(null);
  const [republishing, setRepublishing] = useState<Req | null>(null);
  const [activeSubject, setActiveSubject] = useState<string>('all');

  // Подсчёт откликов по заявкам — на моках их можно подгружать лениво,
  // здесь упрощённо считаем «без откликов» через наличие republishCount=0 и времени публикации.
  // (Реальные responses возьмём в карточке.)

  const filteredRows = useMemo(() => {
    let r = rows;
    if (activeSubject !== 'all') {
      r = r.filter((x) => x.subjectId === activeSubject);
    }
    // Сортировка: новые сверху (по publishedAt, иначе по createdAt)
    return r.slice().sort((a, b) => {
      const aTime = a.publishedAt ?? a.createdAt;
      const bTime = b.publishedAt ?? b.createdAt;
      return bTime.localeCompare(aTime);
    });
  }, [rows, activeSubject]);

  async function createRequest(d: CreateRequestPayload) {
    try {
      const res = await api.post<{ request: Req }>('/api/requests', d);
      setRows((p) => [res.request, ...p]);
      setCreating(false);
      toast.success('Заявка создана');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  async function republish(d: {
    id: string;
    pricePerHour: string | null;
    requestPrice: string | null;
    extraInfo: string | null;
  }) {
    try {
      const res = await api.post<{ request: Req }>(`/api/requests/${d.id}/republish`, {
        pricePerHour: d.pricePerHour,
        requestPrice: d.requestPrice,
        extraInfo: d.extraInfo,
      });
      setRows((p) => p.map((x) => (x.id === res.request.id ? res.request : x)));
      setRepublishing(null);
      toast.success('Заявка перевыставлена');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Ошибка');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Все заявки</CardTitle>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Заявка
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={activeSubject} onValueChange={setActiveSubject}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="all" className="gap-1.5">
              Все
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] font-normal">
                {rows.length}
              </Badge>
            </TabsTrigger>
            {subjects.map((s) => {
              const count = rows.filter((r) => r.subjectId === s.id).length;
              return (
                <TabsTrigger key={s.id} value={s.id} className="gap-1.5">
                  {s.name}
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] font-normal">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <DataTable
          getRowId={(r) => r.id}
          rows={filteredRows}
          onRowClick={(r) => setOpened(r)}
          emptyTitle="Нет заявок"
          columns={[
            {
              key: 'client',
              header: 'Клиент / ученик',
              cell: (r) => (
                <div>
                  <div className="font-medium">{r.studentName ?? r.clientName}</div>
                  <div className="text-muted-foreground text-xs">
                    {r.clientName} · {r.subjectName ?? 'без предмета'}
                  </div>
                </div>
              ),
            },
            {
              key: 'details',
              header: 'Детали',
              cell: (r) => (
                <div className="text-xs">
                  {r.age ? `${r.age} лет` : null}
                  {r.grade ? ` · ${r.grade} кл.` : null}
                  {r.schedule ? <div className="text-muted-foreground">{r.schedule}</div> : null}
                </div>
              ),
            },
            {
              key: 'price',
              header: 'Цена',
              cell: (r) => (
                <div className="text-xs">
                  <div>час: {r.pricePerHour ?? '—'}</div>
                  <div>заявка: {r.requestPrice ?? '—'}</div>
                </div>
              ),
            },
            {
              key: 'stage',
              header: 'Стадия',
              cell: (r) => {
                const s = stages.find((x) => x.kind === r.stage);
                return s ? <StagePill name={s.name} color={s.color} /> : r.stage;
              },
            },
            {
              key: 'channels',
              header: 'Каналы',
              cell: (r) =>
                r.publishedChannels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {r.publishedChannels.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px] font-normal">
                        {c}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">не опубликована</span>
                ),
            },
            {
              key: 'updated',
              header: 'Обновлена',
              cell: (r) => formatFull(r.updatedAt),
            },
            {
              key: 'actions',
              header: '',
              cell: (r) => {
                if (!shouldOfferRepublish(r)) return null;
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRepublishing(r);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Перевыставить
                  </Button>
                );
              },
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
      <RepublishDialog
        request={republishing}
        onClose={() => setRepublishing(null)}
        onConfirm={republish}
      />
    </Card>
  );
}

// Кнопка появляется, когда заявка опубликована, но нет откликов и прошло > 1 часа.
// Без подгрузки responses ориентируемся на (publishedAt > 1h назад) и стадию searching/published.
function shouldOfferRepublish(r: Req): boolean {
  if (!r.publishedAt) return false;
  if (r.stage !== 'published' && r.stage !== 'searching_tutor') return false;
  const sinceMs = Date.now() - new Date(r.publishedAt).getTime();
  return sinceMs > HOUR_MS;
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
  onCreate: (d: CreateRequestPayload) => void;
  clients: { id: string; name: string; dispatcherId: string | null }[];
  subjects: Subject[];
}) {
  const [clientId, setClientId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [dealType, setDealType] = useState<'contract' | 'one_time'>('contract');
  const [studentName, setStudentName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [schedule, setSchedule] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [requestPrice, setRequestPrice] = useState('');
  const [extraInfo, setExtraInfo] = useState('');

  function reset() {
    setClientId('');
    setSubjectId('');
    setDealType('contract');
    setStudentName('');
    setAge('');
    setGrade('');
    setSchedule('');
    setPricePerHour('');
    setRequestPrice('');
    setExtraInfo('');
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
            Все поля кроме клиента — необязательные. В ценах можно ввести «Договорная».
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
              <Select
                value={subjectId === '' ? '__none' : subjectId}
                onValueChange={(v) => setSubjectId(v === '__none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
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
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Имя ученика">
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </FormField>
            <FormField label="Возраст">
              <Input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
            </FormField>
            <FormField label="Класс">
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Желаемый график">
            <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Цена в час" description="Число или «Договорная»">
              <Input
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                placeholder="500 или Договорная"
              />
            </FormField>
            <FormField label="Цена заявки" description="Число или «Договорная»">
              <Input
                value={requestPrice}
                onChange={(e) => setRequestPrice(e.target.value)}
                placeholder="1500 или Договорная"
              />
            </FormField>
          </div>
          <FormField label="Доп. информация">
            <Textarea
              rows={3}
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Цели, особенности, ограничения…"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!clientId}
            onClick={() => {
              onCreate({
                clientId,
                subjectId: subjectId === '' ? null : subjectId,
                dealType,
                description: extraInfo.trim() || studentName.trim() || '',
                studentName: studentName.trim() || null,
                age: age === '' ? null : Number(age),
                grade: grade.trim() || null,
                schedule: schedule.trim() || null,
                pricePerHour: pricePerHour.trim() || null,
                requestPrice: requestPrice.trim() || null,
                extraInfo: extraInfo.trim() || null,
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

function RepublishDialog({
  request,
  onClose,
  onConfirm,
}: {
  request: Req | null;
  onClose: () => void;
  onConfirm: (d: {
    id: string;
    pricePerHour: string | null;
    requestPrice: string | null;
    extraInfo: string | null;
  }) => void;
}) {
  const [pricePerHour, setPricePerHour] = useState('');
  const [requestPrice, setRequestPrice] = useState('');
  const [extraInfo, setExtraInfo] = useState('');

  useEffect(() => {
    if (request) {
      setPricePerHour(request.pricePerHour ?? '');
      setRequestPrice(request.requestPrice ?? '');
      setExtraInfo(request.extraInfo ?? '');
    }
  }, [request]);

  if (!request) return null;

  return (
    <Dialog open={request !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Перевыставить заявку</DialogTitle>
          <DialogDescription>
            Поправь цену и описание — заявка пойдёт в каналы заново. Прошло{' '}
            {request.publishedAt
              ? `${Math.round((Date.now() - new Date(request.publishedAt).getTime()) / HOUR_MS)} ч`
              : '—'}{' '}
            без откликов.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Цена в час">
              <Input value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} />
            </FormField>
            <FormField label="Цена заявки">
              <Input value={requestPrice} onChange={(e) => setRequestPrice(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Описание / доп. инфо">
            <Textarea rows={5} value={extraInfo} onChange={(e) => setExtraInfo(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                id: request.id,
                pricePerHour: pricePerHour.trim() || null,
                requestPrice: requestPrice.trim() || null,
                extraInfo: extraInfo.trim() || null,
              })
            }
          >
            Перевыставить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
