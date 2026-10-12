import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ExampleItemPage } from '@/features/example-item/pages/ExampleItemPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('example-item');
  return { title: t('record_title') };
}

// Request-time render: one record behind a session; nothing here may be prerendered.
export const dynamic = 'force-dynamic';

export default async function Page(props: PageProps<'/example-item/[id]'>) {
  const { id } = await props.params;
  return <ExampleItemPage id={id} />;
}
