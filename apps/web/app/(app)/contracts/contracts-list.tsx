'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Contract, ContractStatus, Subject, Tutor } from '@tutorcrm/contracts';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@tutorcrm/ui';

import { formatCurrency, formatShort } from '@/lib/format';

const STATUS_TONE: Record<ContractStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  closed_won: 'neutral',
  closed_lost: 'danger',
};

const STATUS_LABEL: Record<ContractStatus, string> = {
  active: 'Активен',
  paused: 'Пауза',
  closed_won: 'Завершён',
  closed_lost: 'Отказ',
};

interface Props {
  initial: Contract[];
  tutors: Tutor[];
  subjects: Subject[];
  dispatchers: { id: string; name: string }[];
  canFilterByDispatcher: boolean;
}

export function ContractsList({ initial, subjects, dispatchers, canFilterByDispatcher }: Props) {
  const [activeSubject, setActiveSubject] = useState<string>('all');
  const [filterDispatcher, setFilterDispatcher] = useState<string>('');

  const filtered = useMemo(() => {
    let r = initial;
    if (activeSubject !== 'all') {
      r = r.filter((c) => c.subjectId === activeSubject);
    }
    if (canFilterByDispatcher && filterDispatcher) {
      r = r.filter((c) => c.dispatcherId === filterDispatcher);
    }
    return r;
  }, [initial, activeSubject, filterDispatcher, canFilterByDispatcher]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Все ученики</CardTitle>
        {canFilterByDispatcher ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Диспетчер:</span>
            <Select
              value={filterDispatcher === '' ? '__all' : filterDispatcher}
              onValueChange={(v) => setFilterDispatcher(v === '__all' ? '' : v)}
            >
              <SelectTrigger className="h-9 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Все</SelectItem>
                {dispatchers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={activeSubject} onValueChange={setActiveSubject}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="all" className="gap-1.5">
              Все
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] font-normal">
                {initial.length}
              </Badge>
            </TabsTrigger>
            {subjects.map((s) => {
              const count = initial.filter((c) => c.subjectId === s.id).length;
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
          getRowId={(c) => c.id}
          rows={filtered}
          emptyTitle="Нет контрактов"
          columns={[
            {
              key: 'code',
              header: 'Код',
              className: 'whitespace-nowrap',
              cell: (c) => (
                <Link
                  href={`/contracts/${c.id}`}
                  className="text-primary font-mono font-medium hover:underline"
                >
                  {c.code ?? `#${c.id.slice(-6)}`}
                </Link>
              ),
            },
            {
              key: 'student',
              header: 'Ученик',
              cell: (c) => (
                <Link href={`/contracts/${c.id}`} className="font-medium hover:underline">
                  {c.studentName ?? c.clientName}
                </Link>
              ),
            },
            {
              key: 'tutor',
              header: 'Репетитор',
              cell: (c) => c.tutorName,
            },
            {
              key: 'lessons',
              header: 'Ур./нед',
              align: 'right',
              cell: (c) => <span className="tabular-nums">{c.lessonsPerWeek ?? '—'}</span>,
            },
            {
              key: 'rate',
              header: 'Цена/ур.',
              align: 'right',
              className: 'whitespace-nowrap',
              cell: (c) => (
                <span className="tabular-nums">
                  {c.pricePerLesson ?? formatCurrency(c.hourlyRate)}
                </span>
              ),
            },
            {
              key: 'paid',
              header: 'Оплата',
              align: 'right',
              className: 'whitespace-nowrap',
              cell: (c) => (
                <div className="flex items-center justify-end gap-1.5 tabular-nums">
                  {c.amountReceived ? (
                    <span>{formatCurrency(c.amountReceived)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {c.accountantVerified ? (
                    <span
                      title="Бухгалтер подтвердил"
                      className="text-emerald-600 dark:text-emerald-400"
                    >
                      ✓
                    </span>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Статус',
              cell: (c) => (
                <StatusBadge tone={STATUS_TONE[c.status]} label={STATUS_LABEL[c.status]} />
              ),
            },
            {
              key: 'started',
              header: 'С даты',
              align: 'right',
              className: 'whitespace-nowrap',
              cell: (c) => (
                <span className="text-muted-foreground tabular-nums">
                  {formatShort(c.startedAt)}
                </span>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
