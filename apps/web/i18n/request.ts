import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE, type Locale } from './config';

export default getRequestConfig(async () => {
  const locale: Locale = DEFAULT_LOCALE;
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: 'Europe/Kyiv',
  };
});
