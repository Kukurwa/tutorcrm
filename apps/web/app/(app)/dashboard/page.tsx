import Link from 'next/link';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  RoleBadge,
} from '@tutorcrm/ui';

import { requireSession } from '@/lib/auth/session';
import { leadsStore, subjectsStore, usersStore } from '@/mocks/store';

import { DashboardView } from './dashboard-view';

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.user.role === 'leadgen') {
    const leads = await leadsStore.list();
    const mine = leads.filter((l) => l.createdBy === session.user.id).length;
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Здравствуйте, ${session.user.name.split(' ')[0] ?? session.user.name}`}
          description="Сводка по вашим лидам."
          actions={<RoleBadge role={session.user.role} />}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Мои лиды</CardTitle>
              <CardDescription>Всего создано.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{mine}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Создать лид</CardTitle>
              <CardDescription>Быстрая форма на странице LeadGen.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href="/leadgen">К форме</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const [subjects, users] = await Promise.all([subjectsStore.list(), usersStore.list()]);
  const dispatchers = users
    .filter((u) => u.role === 'dispatcher')
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Здравствуйте, ${session.user.name.split(' ')[0] ?? session.user.name}`}
        description="Сводка, метрики и экспорт."
        actions={<RoleBadge role={session.user.role} />}
      />
      <DashboardView
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        dispatchers={dispatchers}
        showDispatcherFilter={session.user.role === 'admin'}
      />
    </div>
  );
}
