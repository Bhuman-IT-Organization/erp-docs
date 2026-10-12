import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { GuardedExampleItemForm } from '@/features/example-item/components/ExampleItemForm';
import { pick } from '@/lib/i18n/pick';

/** The namespaces the client subtree needs: a nested provider REPLACES the messages above it. */
const SLICE = ['common', 'example-item'] as const;

interface ExampleItemPageProps {
  /** The record's id from `app/(shell)/example-item/[id]/page.tsx`; `null` on the create route. */
  readonly id: string | null;
}

/**
 * The `/example-item/new` and `/example-item/:id` composition (a Server Component): the form under
 * its own message slice, behind its guards. The record is read in the browser, where the form
 * renders its own title. No `<main>`: the shell's `PageShell` owns it.
 */
export async function ExampleItemPage({ id }: ExampleItemPageProps) {
  const messages = pick(await getMessages(), [...SLICE]);
  return (
    <NextIntlClientProvider messages={messages}>
      <GuardedExampleItemForm id={id} />
    </NextIntlClientProvider>
  );
}
