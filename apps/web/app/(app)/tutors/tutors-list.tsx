'use client';

import { ExternalLink, Plus, ShieldOff } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Request as Req, Tutor, TutorStatus, TutorTermsKind } from '@tutorcrm/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  cn,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@tutorcrm/ui';

import { api, ApiClientError } from '@/lib/api-client';
import { formatFull } from '@/lib/format';

export interface TutorStats {
  activeContracts: number;
  totalContracts: number;
  closedWon: number;
  closedLost: number;
  totalAssignments: number;
  effectivenessRate: number | null; // 0..1
  totalTrials: number;
}

export interface TutorWithStats extends Tutor {
  stats: TutorStats;
}

interface Props {
  initial: TutorWithStats[];
  subjects: { id: string; name: string; code: string }[];
  currentUserId: string;
  requests: Req[];
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
  activeContracts: 0,
  totalContracts: 0,
  closedWon: 0,
  closedLost: 0,
  totalAssignments: 0,
  effectivenessRate: null,
  totalTrials: 0,
};

export function TutorsList({ initial, subjects, currentUserId, requests }: Props) {
  const [tutors, setTutors] = useState<TutorWithStats[]>(initial);
  const [creating, setCreating] = useState(false);
  const [opened, setOpened] = useState<TutorWithStats | null>(null);
  const [activeTerms, setActiveTerms] = useState<TutorTermsKind>('contract');
  const [activeSubject, setActiveSubject] = useState<string>('all');

  const filtered = useMemo(() => {
    return tutors.filter((t) => {
      if (t.termsKind !== activeTerms) return false;
      if (activeSubject !== 'all' && !t.subjects.includes(activeSubject)) return false;
      return true;
    });
  }, [tutors, activeTerms, activeSubject]);

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
      if (opened && opened.id === id) {
        setOpened({ ...res.tutor, stats: opened.stats });
      }
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
      <CardContent className="space-y-3">
        <Tabs value={activeTerms} onValueChange={(v) => setActiveTerms(v as TutorTermsKind)}>
          <TabsList>
            <TabsTrigger value="contract">
              Контрактные ({tutors.filter((t) => t.termsKind === 'contract').length})
            </TabsTrigger>
            <TabsTrigger value="regular">
              Обычные ({tutors.filter((t) => t.termsKind === 'regular').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contract" className="space-y-3">
            <SubjectTabs
              subjects={subjects}
              tutors={tutors.filter((t) => t.termsKind === 'contract')}
              active={activeSubject}
              onChange={setActiveSubject}
            />
          </TabsContent>
          <TabsContent value="regular" className="space-y-3">
            <SubjectTabs
              subjects={subjects}
              tutors={tutors.filter((t) => t.termsKind === 'regular')}
              active={activeSubject}
              onChange={setActiveSubject}
            />
          </TabsContent>
        </Tabs>

        <DataTable
          getRowId={(t) => t.id}
          rows={filtered}
          onRowClick={(t) => setOpened(t)}
          emptyTitle="Нет репетиторов"
          columns={[
            {
              key: 'name',
              header: 'Имя Фамилия',
              cell: (t) => (
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {t.name}
                    {t.isBlacklisted ? (
                      <StatusBadge tone="danger" label="ЧС" className="text-[10px]" />
                    ) : null}
                  </div>
                  {t.telegramHandle ? (
                    <div className="text-muted-foreground text-xs">{t.telegramHandle}</div>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'age',
              header: 'Возраст',
              align: 'right',
              cell: (t) => <span className="text-sm">{t.age ?? '—'}</span>,
            },
            {
              key: 'experience',
              header: 'Опыт',
              align: 'right',
              cell: (t) => <span className="text-sm">{t.experienceYears} л.</span>,
            },
            {
              key: 'effectiveness',
              header: 'Эффективность',
              align: 'right',
              cell: (t) => (
                <div className="text-sm">
                  {t.stats.effectivenessRate !== null ? (
                    <>
                      <span className="font-semibold">
                        {Math.round(t.stats.effectivenessRate * 100)}%
                      </span>
                      <div className="text-muted-foreground text-xs">
                        {t.stats.closedWon}/{t.stats.totalAssignments}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              ),
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
      <TutorDetailDialog
        tutor={opened}
        onClose={() => setOpened(null)}
        onSave={(patch) => {
          if (opened) update(opened.id, patch);
        }}
        currentUserId={currentUserId}
        requests={requests}
        subjects={subjects}
      />
    </Card>
  );
}

function SubjectTabs({
  subjects,
  tutors,
  active,
  onChange,
}: {
  subjects: { id: string; name: string; code: string }[];
  tutors: TutorWithStats[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <Tabs value={active} onValueChange={onChange}>
      <TabsList className="flex h-auto flex-wrap justify-start">
        <TabsTrigger value="all" className="gap-1.5">
          Все
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] font-normal">
            {tutors.length}
          </Badge>
        </TabsTrigger>
        {subjects.map((s) => {
          const count = tutors.filter((t) => t.subjects.includes(s.id)).length;
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
  );
}

function TutorDetailDialog({
  tutor,
  onClose,
  onSave,
  currentUserId,
  requests,
  subjects,
}: {
  tutor: TutorWithStats | null;
  onClose: () => void;
  onSave: (patch: Partial<Tutor>) => void;
  currentUserId: string;
  requests: Req[];
  subjects: { id: string; name: string; code: string }[];
}) {
  const [showAllHistory, setShowAllHistory] = useState(false);

  if (!tutor) return null;

  const allAssignments = requests.filter((r) => r.assignedTutorId === tutor.id);
  const myAssignments = allAssignments.filter((r) => r.dispatcherId === currentUserId);
  const visibleHistory = showAllHistory ? allAssignments : myAssignments;

  const subjectNames = tutor.subjects
    .map((id) => subjects.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <Dialog open={tutor !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tutor.name}
            {tutor.isBlacklisted ? <StatusBadge tone="danger" label="ЧС" /> : null}
            <StatusBadge tone={STATUS_TONE[tutor.status]} label={STATUS_LABEL[tutor.status]} />
          </DialogTitle>
          <DialogDescription>
            {tutor.termsKind === 'contract' ? 'Контрактные условия' : 'Обычные условия'} ·{' '}
            {subjectNames || 'без предметов'}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Профиль</TabsTrigger>
            <TabsTrigger value="history">История заявок ({visibleHistory.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="grid gap-3 md:grid-cols-2">
            <Field label="Ім'я Прізвище" value={tutor.name} />
            <Field
              label="Номер телефону"
              value={tutor.phone}
              action={tutor.phone ? `tel:${tutor.phone}` : null}
            />
            <Field
              label="Номер у Вайбері"
              value={tutor.viberPhone}
              action={
                tutor.viberPhone
                  ? `viber://chat?number=${encodeURIComponent(tutor.viberPhone)}`
                  : null
              }
            />
            <Field
              label="Нік в телеграмі"
              value={tutor.telegramHandle}
              action={
                tutor.telegramHandle
                  ? `https://t.me/${tutor.telegramHandle.replace(/^@/, '')}`
                  : null
              }
            />
            <Field label="Досвід роботи" value={`${tutor.experienceYears} р.`} />
            <Field label="Вік" value={tutor.age?.toString() ?? null} />
            <Field
              label="Офлайн"
              value={tutor.isOffline ? `так (${tutor.offlineCity ?? '—'})` : 'ні'}
            />
            <Field label="Додатковий предмет" value={tutor.additionalSubject} />
            <Field label="Освіта" value={tutor.education} />
            <Field label="Викладання російською" value={tutor.teachesInRussian ? 'так' : 'ні'} />
            <Field
              label="Рівні знань"
              value={tutor.workingLevels.length > 0 ? tutor.workingLevels.join(', ') : null}
            />
            <Field label="Вікова категорія" value={tutor.workingAgeRange} />
            <div className="md:col-span-2">
              <Field
                label="Особливості методу викладання"
                value={tutor.teachingMethodNotes}
                multiline
              />
            </div>
            <div className="md:col-span-2">
              <Field label="Додаткова інформація" value={tutor.additionalInfo} multiline />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="bl"
                checked={tutor.isBlacklisted}
                onCheckedChange={(v) => onSave({ isBlacklisted: v === true })}
              />
              <Label htmlFor="bl" className="text-sm">
                <ShieldOff className="mr-1 inline h-4 w-4" />В чёрном списке
              </Label>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              {tutor.telegramHandle ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info('Откроется в Telegram (заглушка для MVP)')}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Связаться в TG
                </Button>
              ) : null}
              {tutor.phone ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info('Звонок (заглушка для MVP)')}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Позвонить
                </Button>
              ) : null}
            </div>
          </TabsContent>
          <TabsContent value="history" className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showAllHistory ? 'outline' : 'default'}
                onClick={() => setShowAllHistory(false)}
              >
                Только свои ({myAssignments.length})
              </Button>
              <Button
                size="sm"
                variant={showAllHistory ? 'default' : 'outline'}
                onClick={() => setShowAllHistory(true)}
              >
                Все диспетчеры ({allAssignments.length})
              </Button>
            </div>
            {visibleHistory.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
                Нет заявок
              </p>
            ) : (
              <ul className="space-y-2">
                {visibleHistory.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm"
                  >
                    <span className="font-medium">{r.studentName ?? r.clientName}</span>
                    <span className="text-muted-foreground">
                      {r.subjectName ?? '—'} · {r.dealType === 'contract' ? 'контракт' : 'разовый'}
                    </span>
                    <StatusBadge tone="info" label={r.stage} />
                    <span className="text-muted-foreground ml-auto text-xs">
                      {formatFull(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  action,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  action?: string | null;
  multiline?: boolean;
}) {
  const display = value && value.trim() ? value : '—';
  return (
    <div>
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      {action ? (
        <a
          href={action}
          className="text-primary text-sm hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {display}
        </a>
      ) : (
        <div className={cn('text-sm', multiline && 'whitespace-pre-wrap')}>{display}</div>
      )}
    </div>
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
  subjects: { id: string; name: string; code: string }[];
  defaults?: Tutor;
}) {
  const [name, setName] = useState(defaults?.name ?? '');
  const [phone, setPhone] = useState(defaults?.phone ?? '');
  const [viberPhone, setViberPhone] = useState(defaults?.viberPhone ?? '');
  const [telegramHandle, setTelegramHandle] = useState(defaults?.telegramHandle ?? '');
  const [age, setAge] = useState(defaults?.age?.toString() ?? '');
  const [experience, setExperience] = useState(defaults?.experienceYears ?? 0);
  const [rate, setRate] = useState(defaults?.hourlyRate ?? 0);
  const [termsKind, setTermsKind] = useState<TutorTermsKind>(defaults?.termsKind ?? 'regular');
  const [isOffline, setIsOffline] = useState(defaults?.isOffline ?? false);
  const [offlineCity, setOfflineCity] = useState(defaults?.offlineCity ?? '');
  const [additionalSubject, setAdditionalSubject] = useState(defaults?.additionalSubject ?? '');
  const [education, setEducation] = useState(defaults?.education ?? '');
  const [teachesInRussian, setTeachesInRussian] = useState(defaults?.teachesInRussian ?? false);
  const [workingLevels, setWorkingLevels] = useState((defaults?.workingLevels ?? []).join(', '));
  const [workingAgeRange, setWorkingAgeRange] = useState(defaults?.workingAgeRange ?? '');
  const [teachingMethodNotes, setTeachingMethodNotes] = useState(
    defaults?.teachingMethodNotes ?? '',
  );
  const [additionalInfo, setAdditionalInfo] = useState(defaults?.additionalInfo ?? '');
  const [isBlacklisted, setIsBlacklisted] = useState(defaults?.isBlacklisted ?? false);
  const [note, setNote] = useState(defaults?.note ?? '');
  const [status, setStatus] = useState<TutorStatus>(defaults?.status ?? 'active');
  const [picked, setPicked] = useState<string[]>(defaults?.subjects ?? []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{defaults ? 'Редактирование' : 'Новый репетитор'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ім'я Прізвище" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Тип условий">
              <Select value={termsKind} onValueChange={(v) => setTermsKind(v as TutorTermsKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Контрактные</SelectItem>
                  <SelectItem value="regular">Обычные</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Телефон">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="Viber">
              <Input value={viberPhone} onChange={(e) => setViberPhone(e.target.value)} />
            </FormField>
            <FormField label="Telegram">
              <Input
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                placeholder="@nickname"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Возраст">
              <Input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isOffline} onCheckedChange={(v) => setIsOffline(v === true)} />
                Офлайн
              </label>
              {isOffline ? (
                <Input
                  value={offlineCity}
                  onChange={(e) => setOfflineCity(e.target.value)}
                  placeholder="Місто"
                />
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={teachesInRussian}
                onCheckedChange={(v) => setTeachesInRussian(v === true)}
              />
              Викладання російською
            </label>
          </div>
          <FormField label="Освіта / де навчається">
            <Input value={education} onChange={(e) => setEducation(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Додатковий предмет">
              <Input
                value={additionalSubject}
                onChange={(e) => setAdditionalSubject(e.target.value)}
              />
            </FormField>
            <FormField label="Вікова категорія">
              <Input
                value={workingAgeRange}
                onChange={(e) => setWorkingAgeRange(e.target.value)}
                placeholder="14-18"
              />
            </FormField>
          </div>
          <FormField label="Рівні знань (через кому)">
            <Input
              value={workingLevels}
              onChange={(e) => setWorkingLevels(e.target.value)}
              placeholder="ЗНО, B1, 9-11 клас"
            />
          </FormField>
          <FormField label="Особливості методу">
            <Textarea
              value={teachingMethodNotes}
              onChange={(e) => setTeachingMethodNotes(e.target.value)}
            />
          </FormField>
          <FormField label="Додаткова інформація">
            <Textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} />
          </FormField>
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
          <div className="grid grid-cols-2 gap-3">
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
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isBlacklisted}
                onCheckedChange={(v) => setIsBlacklisted(v === true)}
              />
              <ShieldOff className="h-4 w-4" />В чёрном списке
            </label>
          </div>
          <FormField label="Заметка диспетчера">
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
                viberPhone: viberPhone.trim() || null,
                telegramHandle: telegramHandle.trim() || null,
                age: age === '' ? null : Number(age),
                experienceYears: experience,
                hourlyRate: rate,
                termsKind,
                isOffline,
                offlineCity: isOffline ? offlineCity.trim() || null : null,
                additionalSubject: additionalSubject.trim() || null,
                education: education.trim() || null,
                teachesInRussian,
                workingLevels: workingLevels
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                workingAgeRange: workingAgeRange.trim() || null,
                teachingMethodNotes: teachingMethodNotes.trim() || null,
                additionalInfo: additionalInfo.trim() || null,
                isBlacklisted,
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
