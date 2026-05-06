import { ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@tutorcrm/ui';

import { ColoredAvatar } from '@/components/colored-avatar';
import { ContactTile } from '@/components/contact-tile';
import { requireRole } from '@/lib/auth/session';
import { formatFull, formatShort } from '@/lib/format';
import {
  clientContactsStore,
  clientsStore,
  contractsStore,
  requestsStore,
  usersStore,
} from '@/mocks/store';

interface Props {
  params: { id: string };
}

export default async function ClientPage({ params }: Props) {
  const session = await requireRole('admin', 'dispatcher');
  const client = await clientsStore.findById(params.id);
  if (!client) notFound();
  if (
    session.user.role === 'dispatcher' &&
    client.dispatcherId &&
    client.dispatcherId !== session.user.id
  ) {
    notFound();
  }

  const [contacts, contracts, requests, users] = await Promise.all([
    clientContactsStore.list(),
    contractsStore.list(),
    requestsStore.list(),
    usersStore.list(),
  ]);

  const myContacts = contacts.filter((c) => c.clientId === client.id);
  const myContracts = contracts
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const myRequests = requests
    .filter((r) => r.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const dispatcher = users.find((u) => u.id === client.dispatcherId);
  const totalSpent = myContracts.reduce((sum, c) => sum + (c.amountReceived ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header — карточка с аватаркой, бейджем, действиями */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-1 items-start gap-4">
            <ColoredAvatar name={client.name} className="h-16 w-16 text-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-sky-100 font-normal text-sky-700">
                  Клиент
                </Badge>
                {dispatcher ? (
                  <Badge variant="outline" className="font-normal">
                    {dispatcher.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground font-normal">
                    Без диспетчера
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-semibold leading-tight">{client.name}</h1>
              {client.note ? <p className="text-muted-foreground text-sm">{client.note}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Редактировать">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Контакты — тайлы */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
          Контакты
        </h2>
        {myContacts.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground p-6 text-sm">
              Нет контактов{client.phone ? ` · ${client.phone}` : ''}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myContacts.map((c) => (
              <ContactTile
                key={c.id}
                kind={c.kind}
                label={c.primary ? (c.kind === 'phone' ? 'Телефон (основной)' : c.kind) : c.kind}
                value={c.value}
                href={
                  c.kind === 'phone' || c.kind === 'whatsapp'
                    ? `tel:${c.value}`
                    : c.kind === 'email'
                      ? `mailto:${c.value}`
                      : c.kind === 'telegram'
                        ? `https://t.me/${c.value.replace(/^@/, '')}`
                        : null
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Сводка */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">Заказов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{myContracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">Заявок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{myRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">Получено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {totalSpent > 0 ? `${totalSpent.toLocaleString('ru-RU')} ₴` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Заказы */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Заказы</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {myContracts.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {myContracts.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              Заказов нет
            </p>
          ) : (
            <ul className="space-y-2">
              {myContracts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="hover:bg-muted/50 group flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm transition-colors"
                  >
                    <span className="bg-primary/10 text-primary rounded-md px-2 py-1 font-mono text-xs font-semibold">
                      {c.code ?? `#${c.id.slice(-6)}`}
                    </span>
                    <span className="font-medium">{c.subjectName ?? '—'}</span>
                    <span className="text-muted-foreground">репетитор: {c.tutorName}</span>
                    <StatusBadge
                      tone={
                        c.status === 'active'
                          ? 'success'
                          : c.status === 'paused'
                            ? 'warning'
                            : 'neutral'
                      }
                      label={
                        c.status === 'active'
                          ? 'Активен'
                          : c.status === 'paused'
                            ? 'Пауза'
                            : c.status === 'closed_won'
                              ? 'Завершён'
                              : 'Отказ'
                      }
                    />
                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                      {formatShort(c.startedAt)}
                    </span>
                    <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Заявки */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Заявки</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {myRequests.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              Заявок нет
            </p>
          ) : (
            <ul className="space-y-2">
              {myRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <FileText className="text-muted-foreground h-4 w-4" />
                  <span className="font-medium">{r.subjectName ?? '—'}</span>
                  <Badge variant="outline" className="font-normal">
                    {r.dealType === 'contract' ? 'Контрактный' : 'Разовый'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {r.studentName ? r.studentName : ''}
                    {r.age ? `, ${r.age}` : ''}
                    {r.grade ? `, ${r.grade} кл.` : ''}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {formatFull(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
