'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@tutorcrm/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">{t('error')}</h1>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">digest: {error.digest}</p>
        ) : null}
        <Button onClick={() => reset()}>{t('retry')}</Button>
      </div>
    </main>
  );
}
