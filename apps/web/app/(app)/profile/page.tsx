import { PageHeader } from '@tutorcrm/ui';

import { requireSession } from '@/lib/auth/session';
import { getUserSettings } from '@/mocks/store';

import { ProfileForm } from './profile-form';

export const metadata = { title: 'Профиль — TutorCRM' };

export default async function ProfilePage() {
  const session = await requireSession();
  const settings = getUserSettings(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Профиль" description="Пароль, уведомления, тема, тихие часы." />
      <ProfileForm
        user={{
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        }}
        settings={settings}
      />
    </div>
  );
}
