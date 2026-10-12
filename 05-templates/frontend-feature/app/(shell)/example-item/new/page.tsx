import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ExampleItemPage } from '@/features/example-item/pages/ExampleItemPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('example-item');
  return { title: t('new_title') };
}

// Request-time render: the form is behind a session, so it must never be prerendered at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ExampleItemPage id={null} />;
}
