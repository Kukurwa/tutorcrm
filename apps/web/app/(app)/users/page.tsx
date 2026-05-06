import { PageHeader } from '@tutorcrm/ui';

import { requireRole } from '@/lib/auth/session';
import { usersStore } from '@/mocks/store';

import { UsersList } from './users-list';

export const metadata = { title: 'Пользователи — TutorCRM' };

export default async function UsersPage() {
  await requireRole('admin');

  const users = await usersStore.list();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Пользователи"
        description="Администратор / Диспетчер / Лидген. Только администратор управляет этим разделом."
      />
      <UsersList
        initial={users
          .map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status }))
          .sort((a, b) => a.name.localeCompare(b.name))}
      />
    </div>
  );
}
