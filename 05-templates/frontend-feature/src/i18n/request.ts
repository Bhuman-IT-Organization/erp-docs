// STUB of erp-web/src/i18n/request.ts: never copied into erp-web; erp-web's falls back to `branding.defaultLocale` between the cookie and `en`.
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { messagesFor } from '@/messages';
import { LOCALE_COOKIE, toSupportedLocale } from './locales';

/**
 * next-intl request config (App Router without i18n routing; `createNextIntlPlugin()` in
 * `next.config.ts` resolves this file). The ONLY reader of the locale cookie: `erp_locale` → a
 * supported locale, else `en`.
 */
export default getRequestConfig(async () => {
  const locale = toSupportedLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, messages: messagesFor(locale) };
});
