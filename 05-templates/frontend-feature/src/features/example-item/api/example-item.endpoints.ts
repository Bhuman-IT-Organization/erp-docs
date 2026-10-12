import type { ApiPath } from '@/lib/api/call-api';
import { createResourceHooks } from '@/lib/api/create-resource-hooks';
import type { FeatureErrorCodes } from '@/lib/errors/error-messages';
import {
  exampleItemSchema,
  type ExampleItem,
  type ExampleItemFormValues,
} from '@/features/example-item/schemas/example-item.schema';

/**
 * The resource's wire contract: every call this feature makes, method and path. The api half is
 * erp-docs `05-templates/backend-module` (copied as erp-api `src/v1/example-item`), which serves
 * exactly these five routes; keep the two in step by hand. The list,
 * `GET …?q&sort&limit&cursor`, answers `{ data: ExampleItem[], meta: { nextCursor, prevCursor,
 * total, rangeStart, exportLimit } }` (BE-19; `ListPageTemplate` reads it). A record is
 * `GET|PATCH …/:id`, a new one `POST`, and the CSV export `GET …/export` with the list's query and
 * one `header` per column (D-26, D-42). There is no delete.
 *
 * No axios import, no raw transport, no duration literal here: reads go through `useCommonApi`
 * (retried per ADR-0031 §5 by SWR), writes through `useCommonMutation` (NEVER retried; the form
 * offers Retry for a retryable code): FE-03.
 */
export const EXAMPLE_ITEM_ENDPOINTS = {
  list: { method: 'GET', path: '/api/v1/example-item' },
  export: { method: 'GET', path: '/api/v1/example-item/export' },
  detail: { method: 'GET', path: '/api/v1/example-item/:id' },
  create: { method: 'POST', path: '/api/v1/example-item' },
  update: { method: 'PATCH', path: '/api/v1/example-item/:id' },
} as const;

export const EXAMPLE_ITEM_PATH = EXAMPLE_ITEM_ENDPOINTS.list.path satisfies ApiPath;
export const EXAMPLE_ITEM_EXPORT_PATH = EXAMPLE_ITEM_ENDPOINTS.export.path satisfies ApiPath;

/** The export's columns in the api's order; `ListExport` types one label per column against it. */
export const EXAMPLE_ITEM_EXPORT_COLUMNS = ['id', 'name', 'label', 'createdAt'] as const;
export type ExampleItemExportColumn = (typeof EXAMPLE_ITEM_EXPORT_COLUMNS)[number];

/** One record's path (its detail read, its update, its seed from the list row), the id encoded. */
export function exampleItemPath(id: string): ApiPath {
  return EXAMPLE_ITEM_ENDPOINTS.detail.path.replace(':id', encodeURIComponent(id)) as ApiPath;
}

export const exampleItemHooks = createResourceHooks<ExampleItem, ExampleItemFormValues>(
  EXAMPLE_ITEM_PATH,
  exampleItemSchema,
);

/** The 400 whose problem body carries `issues` the form maps onto its fields. */
export const VALIDATION_CODE = 'ERP-VALIDATION-0001';

/**
 * The api's one not-found answer: a record that is not there, or one the caller may not read (the
 * same 404, so an id reveals nothing). A permalink to it says so in plain words (D-32).
 */
export const NOT_FOUND_CODE = 'ERP-CORE-0004';

/**
 * The feature's own codes, each with an `example-item.errors.<code>` message: `useErrorText`
 * renders `NOT_FOUND_CODE` as `'errors.ERP-CORE-0004'` of this namespace (messages/en.json).
 */
export const EXAMPLE_ITEM_ERRORS: FeatureErrorCodes = {
  namespace: 'example-item',
  codes: [NOT_FOUND_CODE],
};
