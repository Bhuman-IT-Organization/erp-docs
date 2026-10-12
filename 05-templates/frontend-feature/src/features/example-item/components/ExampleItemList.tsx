'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { ListPageTemplate, type ListColumn } from '@/components/templates/ListPageTemplate';
import {
  EXAMPLE_ITEM_EXPORT_COLUMNS,
  EXAMPLE_ITEM_EXPORT_PATH,
  EXAMPLE_ITEM_PATH,
  exampleItemPath,
} from '@/features/example-item/api/example-item.endpoints';
import {
  exampleItemRowSchema,
  type ExampleItemRow,
} from '@/features/example-item/schemas/example-item.schema';
import { withAuth } from '@/hocs/withAuth';
import { withPermission } from '@/hocs/withPermission';
import { seedRow } from '@/lib/api/row-seed';
import { useFormat } from '@/lib/i18n/format';

/** The list's own route: where the return to the list is recorded and restored (D-28). */
const LIST_BASE = '/example-item';
const itemRoute = (row: ExampleItemRow): string => `${LIST_BASE}/${encodeURIComponent(row.id)}`;

/**
 * The list screen on the kit's `ListPageTemplate` (UIK-06): the template owns the URL state, the
 * settled search, the sort, the pager, the export and every state (loading, empty, no results,
 * error, loaded) in the D-39 order; this screen owns its columns and its actions. A column sorts
 * only when its `sortField` is a keyset key the api accepts (D-41). Every visible string is a key
 * (FE-19), dates go through the format door (FE-26), classes are logical (FE-20).
 */
export function ExampleItemList(): ReactElement {
  const t = useTranslations('example-item');
  const f = useFormat();

  const columns: readonly ListColumn<ExampleItemRow>[] = [
    { id: 'name', header: t('name'), sortField: 'name', primary: true, cell: (row) => row.name },
    {
      id: 'createdAt',
      header: t('created_at'),
      hideBelow: 'md',
      cell: (row) => <time dateTime={row.createdAt}>{f.date(row.createdAt)}</time>,
    },
  ];

  return (
    <ListPageTemplate
      title={t('list_title')}
      path={EXAMPLE_ITEM_PATH}
      rowSchema={exampleItemRowSchema}
      listBase={LIST_BASE}
      rowKey={(row) => row.id}
      rowHref={itemRoute}
      recordName={(row) => row.name}
      // The record opens at once from the row it was clicked on (D-35).
      onRowOpen={(row) => {
        seedRow(exampleItemPath(row.id), row);
      }}
      columns={columns}
      createAction={{ label: t('new_title'), href: `${LIST_BASE}/new` }}
      exportAction={{
        path: EXAMPLE_ITEM_EXPORT_PATH,
        columns: EXAMPLE_ITEM_EXPORT_COLUMNS,
        labels: {
          id: t('id'),
          name: t('name'),
          label: t('label'),
          createdAt: t('created_at'),
        },
      }}
      empty={{
        nothingYetHeading: t('empty_heading'),
        nothingYetBody: t('empty_body'),
        noResultsHeading: (query) => t('no_match_heading', { query }),
        noResultsBody: t('no_match_body'),
      }}
      recordsNoun={t('noun_example_items')}
    />
  );
}

/**
 * The route's guards (UIK-03): a list skeleton until the session and `/me` answer (D-39), then the
 * gate `ROUTE_GATES` declares for the path: `ADMIN_GATE` as generated, so administrators only,
 * until the module's own view code replaces it in erp-web and in @erp/contracts.
 */
export const GuardedExampleItemList = withAuth(
  withPermission(ExampleItemList, { skeleton: 'list' }),
  { skeleton: 'list' },
);
