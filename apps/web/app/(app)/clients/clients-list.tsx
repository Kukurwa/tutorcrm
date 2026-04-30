'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Client, ClientContact, Contract, Subject } from '@tutorcrm/contracts';
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@tutorcrm/ui';

import { formatCurrency, formatShort } from '@/lib/format';

interface Props {
  clients: (Client & { contacts: ClientContact[] })[];
  contracts: Contract[];
  subjects: Subject[];
  dispatchers: { id: string; name: string }[];
  role: 'admin' | 'dispatcher' | 'leadgen';
  canFilterByDispatcher: boolean;
}

export function ClientsList({
  clients,
  contracts,
  subjects,
  dispatchers,
  canFilterByDispatcher,
}: Props) {
  const [activeSubject, setActiveSubject] = useState<string>('all');
  const [filterDispatcher, setFilterDispatcher] = useState<string>('');

  const clientById = useMemo(() => {
    const map = new Map<string, Client & { contacts: ClientContact[] }>();
    for (const c of clients) map.set(c.id, c);
    return map;
  }, [clients]);

  const orderRows = useMemo(() => {
    let rows = contracts;
    if (activeSubject !== 'all') {
      rows = rows.filter((c) => c.subjectId === activeSubject);
    }
    if (canFilterByDispatcher && filterDispatcher) {
      rows = rows.filter((c) => c.dispatcherId === filterDispatcher);
    }
    return rows;
  }, [contracts, activeSubject, filterDispatcher, canFilterByDispatcher]);

  const orphans = clients.filter((c) => !contracts.some((x) => x.clientId === c.id));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Заказы по клиентам</CardTitle>
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
                {contracts.length}
              </Badge>
            </TabsTrigger>
            {subjects.map((s) => {
              const count = contracts.filter((c) => c.subjectId === s.id).length;
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
          rows={orderRows}
          emptyTitle="Нет заказов"
          columns={[
            {
              key: 'code',
              header: 'Код',
              className: 'whitespace-nowrap',
              cell: (r) => (
                <Link
                  href={`/clients/${r.clientId}`}
                  className="text-primary font-mono font-medium hover:underline"
                >
                  {r.code ?? '—'}
                </Link>
              ),
            },
            {
              key: 'student',
              header: 'Ученик',
              cell: (r) => (
                <Link href={`/clients/${r.clientId}`} className="font-medium hover:underline">
                  {r.studentName ?? r.clientName}
                  {r.age ? (
                    <span className="text-muted-foreground ml-1 font-normal">· {r.age}</span>
                  ) : null}
                </Link>
              ),
            },
            {
              key: 'contacts',
              header: 'Контакт',
              className: 'whitespace-nowrap',
              cell: (r) => {
                const cli = clientById.get(r.clientId);
                if (!cli) return <span className="text-muted-foreground">—</span>;
                const primary = cli.contacts.find((x) => x.primary) ?? cli.contacts[0];
                return primary ? primary.value : (cli.phone ?? '—');
              },
            },
            {
              key: 'tutor',
              header: 'Репетитор',
              cell: (r) => (
                <div>
                  <div className="font-medium">{r.tutorName}</div>
                  {r.tutorContact ? (
                    <div className="text-muted-foreground text-xs">{r.tutorContact}</div>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'lpw',
              header: 'Ур./нед',
              align: 'right',
              cell: (r) => <span className="tabular-nums">{r.lessonsPerWeek ?? '—'}</span>,
            },
            {
              key: 'price',
              header: 'Цена/ур.',
              align: 'right',
              className: 'whitespace-nowrap',
              cell: (r) => (
                <span className="tabular-nums">
                  {r.pricePerLesson ?? formatCurrency(r.hourlyRate)}
                </span>
              ),
            },
            {
              key: 'reqPrice',
              header: 'Сумма заявки',
              align: 'right',
              className: 'whitespace-nowrap',
              cell: (r) => <span className="tabular-nums">{r.requestPrice ?? '—'}</span>,
            },
            {
              key: 'trial',
              header: 'Пробный',
              className: 'whitespace-nowrap',
              align: 'right',
              cell: (r) => (
                <span className="text-muted-foreground tabular-nums">
                  {r.trialAt ? formatShort(r.trialAt) : '—'}
                </span>
              ),
            },
            {
              key: 'paid',
              header: 'Оплата',
              className: 'whitespace-nowrap',
              align: 'right',
              cell: (r) => (
                <div className="flex items-center justify-end gap-1.5 tabular-nums">
                  {r.amountReceived ? (
                    <span>{formatCurrency(r.amountReceived)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {r.paidAt ? (
                    <span className="text-muted-foreground text-xs">{formatShort(r.paidAt)}</span>
                  ) : null}
                  {r.accountantVerified ? (
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
              key: 'fop',
              header: 'ФОП',
              align: 'center',
              cell: (r) =>
                r.onFop ? (
                  <span className="text-muted-foreground">✓</span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                ),
            },
            {
              key: 'comment',
              header: 'Комментарии',
              cell: (r) =>
                r.comment ? (
                  <span className="text-muted-foreground line-clamp-1 max-w-[240px]">
                    {r.comment}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                ),
            },
          ]}
        />

        {orphans.length > 0 ? (
          <div className="space-y-2 pt-4">
            <h3 className="text-sm font-medium">Клиенты без активных заказов ({orphans.length})</h3>
            <ul className="grid gap-1 text-sm md:grid-cols-2">
              {orphans.map((c) => (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} className="text-muted-foreground hover:underline">
                    {c.name} {c.phone ? `· ${c.phone}` : ''}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
