import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@tutorcrm/ui';

export default async function NotFound() {
  const t = await getTranslations('errors');

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">{t('notFoundTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('notFoundDescription')}</p>
        <Button asChild>
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>
    </main>
  );
}
