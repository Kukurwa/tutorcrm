import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, PageHeader, StatusBadge } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { formatFull } from '@/lib/format';
import { clientContactsStore, clientsStore, contractsStore, requestsStore } from '@/mocks/store';

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

  const [contacts, contracts, requests] = await Promise.all([
    clientContactsStore.list(),
    contractsStore.list(),
    requestsStore.list(),
  ]);

  const myContacts = contacts.filter((c) => c.clientId === client.id);
  const myContracts = contracts
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const myRequests = requests
    .filter((r) => r.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader title={client.name} description={client.note ?? undefined} />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Контакты</CardTitle>
          </CardHeader>
          <CardContent>
            {myContacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Нет контактов{client.phone ? ` · ${client.phone}` : ''}
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {myContacts.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      {c.kind}
                    </span>
                    <span>{c.value}</span>
                    {c.primary ? (
                      <StatusBadge tone="info" label="primary" className="text-[10px]" />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сводка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Создан:</span> {formatFull(client.createdAt)}
            </div>
            <div>
              <span className="text-muted-foreground">Обновлён:</span>{' '}
              {formatFull(client.updatedAt)}
            </div>
            <div>
              <span className="text-muted-foreground">Заказов:</span> {myContracts.length}
            </div>
            <div>
              <span className="text-muted-foreground">Заявок:</span> {myRequests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Заказы</CardTitle>
        </CardHeader>
        <CardContent>
          {myContracts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Заказов нет</p>
          ) : (
            <ul className="space-y-2">
              {myContracts.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm"
                >
                  <span className="font-mono font-medium">{c.code ?? `#${c.id.slice(-6)}`}</span>
                  <span>{c.subjectName ?? '—'}</span>
                  <span className="text-muted-foreground">репетитор: {c.tutorName}</span>
                  <StatusBadge
                    tone={
                      c.status === 'active'
                        ? 'success'
                        : c.status === 'paused'
                          ? 'warning'
                          : 'neutral'
                    }
                    label={c.status}
                  />
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatFull(c.startedAt)}
                  </span>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="text-primary text-xs hover:underline"
                  >
                    Открыть →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">Заявок нет</p>
          ) : (
            <ul className="space-y-2">
              {myRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm"
                >
                  <span>{r.subjectName ?? '—'}</span>
                  <StatusBadge tone="info" label={r.stage} />
                  <span className="text-muted-foreground">
                    {r.studentName ? `${r.studentName}` : ''}
                    {r.age ? `, ${r.age}` : ''}
                    {r.grade ? `, ${r.grade} кл.` : ''}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs">
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
