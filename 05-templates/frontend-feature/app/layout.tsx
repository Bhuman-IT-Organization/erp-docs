// STUB of erp-web/app/layout.tsx: never copied into erp-web; erp-web's real layout also fetches the brand (theme, default locale) and mounts the ApiUnreachableBanner.
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { direction } from '@/i18n/direction';
import { toSupportedLocale } from '@/i18n/locales';
import { SwrProvider } from '@/lib/api/SwrProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'frontend-feature template',
  description: 'The erp-web feature skeleton, compiled on its own',
};

// `lang` and `dir` are set here, ONCE, from the locale `src/i18n/request.ts` resolved (FE-08).
// The template's provider carries the whole pack: erp-web's carries `common` only and each feature
// page adds its own slice, which the example pages do as well.
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = toSupportedLocale(await getLocale());
  const messages = await getMessages();
  return (
    <html lang={locale} dir={direction(locale)} className="h-full font-sans antialiased">
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SwrProvider>{children}</SwrProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
