# example-item

## Purpose

The skeleton every erp-web feature starts from (copy it, then rename it): a
list, a create screen and a record screen over the resource `/api/v1/example-item`, built on the
base UI kit so a new feature is consistent and usable before anyone edits it. The list is
`ListPageTemplate` (URL state, the settled search, sort, pager, CSV export, every state in the
fixed order); the form is `SchemaForm` (sections, required marks, the error summary, the sticky save
bar) with the save summary and the discard question in `ConfirmDialog`, the unsaved-changes guard
and the return to the exact list URL the user came from. Both screens are exported behind
`withAuth(withPermission(…))`. The labels are the shared verb plus this feature's noun
(`common.save_noun` + `noun_example_item`).

**The api half is the backend template's `example-item`** (erp-api `src/v1/example-item`): it serves exactly the five calls this feature makes (list, detail, create, update and the export: CSV, Excel, PDF and Print), so a module and a feature copied with the same name work together the day they are copied.

**Access: administrators only, as copied.** The three routes are declared on
`ADMIN_GATE` in erp-web `src/config/route-gates.ts` (fail closed). Replace it with the module's own
view code there AND in erp-api `packages/contracts/src/route-gates.ts` once the code exists.

## Legacy screen

None: skeleton; replace with the view path.

## Legacy parity

Class for class, top to bottom, filled in while the screen is rebuilt from its view file (the
`component:line` column is the developer's; the rows are seeded from the view's
`class="…"` tokens). Visual fidelity is a review item: no lint can judge it.

| Legacy class / element | Component:line |
| ---------------------- | -------------- |

The kit already brings one restructured step; keep it when the section is filled from the view:

| Perfex step                                                                                                                                                                         | Node step                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export (CSV / Excel / PDF / Print) exports the rows the table has loaded; to export everything the user first picks "All" in the page-size menu (`main.js:3379`, `app.js:919-1022`) | Export, then CSV, Excel, PDF or Print, exports every row matching the search, filters and sort (or only the ticked rows), with no page-size step |

## Dropped on purpose

- **Current-page-only export**: Perfex exports only the rows its table has loaded; Export
  here always covers every row matching the search, filters and sort, with no page-size step.
- **Arabic PDF, parked**: the PDF's standard font cannot draw Arabic, so the Export menu
  offers no PDF under a right-to-left locale; Print keeps every language.
- **The totals footer row**: no export writes a table footer.

## Routes

All three live in the shell's route group, so they get the sidebar and the topbar, and each is
gated `ADMIN_GATE` in `src/config/route-gates.ts` until the module declares its view code.

- `/example-item` (`app/(shell)/example-item/page.tsx`, `force-dynamic`): renders
  `pages/ExampleItemListPage.tsx`; the list's search, sort and page live in the URL and are read in
  the browser (FE-15); `generateMetadata` → `example-item.list_title`.
- `/example-item/new` (`app/(shell)/example-item/new/page.tsx`): `pages/ExampleItemPage.tsx` with
  no id: "Create example item"; `generateMetadata` → `example-item.new_title`.
- `/example-item/:id` (`app/(shell)/example-item/[id]/page.tsx`): the same page with the id: "Save
  example item"; `generateMetadata` → `example-item.record_title`.
- `app/(shell)/example-item/error.tsx`: the segment's error boundary (keys from `common`; never
  `error.message`).

## Data

`api/example-item.endpoints.ts`: `EXAMPLE_ITEM_ENDPOINTS`, the table of the five calls (method and
path) the api module serves and the hooks send; `EXAMPLE_ITEM_PATH`, `EXAMPLE_ITEM_EXPORT_PATH` and
`exampleItemPath(id)` derive from it. `EXAMPLE_ITEM_EXPORT_COLUMNS` (the export's columns in the
api's order; `ListExport` types one label per column). `EXAMPLE_ITEM_ERRORS`: the feature's one
code, `NOT_FOUND_CODE` (`ERP-CORE-0004`, a record that is not there or that the caller may not read).
Change a call here and in the api module together.

- The list page is `ListPageTemplate`'s own read of `EXAMPLE_ITEM_PATH` (BE-19 keyset meta). A row
  open seeds the record's cache (`seedRow`), so the form renders at once.
- `hooks/use-example-item.ts` → `useExampleItem(id)`: the record read through SWR under the global
  policy (a 5xx, a timeout or a network failure is retried, a 4xx never); `null` asks nothing.
- `hooks/use-save-example-item.ts` → `{ create, update }`: `POST` and `PATCH`, never retried
  automatically, invalidating nothing. After an edit opened from the list the form swaps the saved
  row into the cached list pages (`replaceRowInLists`, no list request); after a create, or
  an edit of a permalink, it revalidates them.
- A 400 `ERP-VALIDATION-0001` carries `issues`; the form zod-parses them
  (`schemas/example-item.schema.ts` `validationIssuesSchema`) before `setError` and never renders
  the api's text. A permalink answered 404 `ERP-CORE-0004` reads
  `errors.ERP-CORE-0004` ("This example item no longer exists…", no Retry) with "Back to list"
  (`common.back_to_list`) to the list it came from (`readListReturn(LIST_BASE)`); a row opened from
  the list whose record answers a 4xx gets the same page. Every failed read offers "Back to list",
  beside Retry when retrying can help. A row opened from the list whose read fails retryably keeps
  the form, because the row is the whole record; a copied feature whose detail carries more
  than its row copies the staff forms: lock the seeded fields until the detail arrives and show the
  error with Retry where the detail is needed (lead 2026-09-27). Every other failure is
  plain language from `common.errors` (`useErrorText(EXAMPLE_ITEM_ERRORS)`): a retryable one is the form's alert with Retry, a refusal stays inside the
  save summary.

The list row and the edit swap: the list reads its rows with `exampleItemRowSchema`
(`schemas/example-item.schema.ts`), the record plus whatever the api's list row adds (a usage
count the delete refuses on, say), and the form seeds with the same schema. An edit opened from the
list swaps `{ ...seed, ...saved }` into the list, so the fields the record lacks survive; a
permalink edit has no seed and knows none of them, so the list pages ask again.
Extend `exampleItemRowSchema` when the list row is wider than the record.

The save summary's errors: the summary `ConfirmDialog` gets `featureErrors={EXAMPLE_ITEM_ERRORS}`,
so a refusal stays in the dialog in the feature's own words: a save answered 404 `ERP-CORE-0004`
(deleted meanwhile) reads `errors.ERP-CORE-0004`, the confirm disabled and the edits kept, never
the common "Something went wrong".

Screen states (FE-27), each an `it` in `components/__tests__/` and a story export: the list's
`Loading`, `Empty`, `Error` and `Loaded` (plus `NoResults` and `Rtl`); the form's `Pending`,
`FieldErrors` and `ServerError` (plus `Default`, `Edit`, `SaveSummary`, `SaveRefused`,
`EditFromList`, `NotFound`, `SeededNotFound` and `Rtl`).

## Messages

`messages/en.json` (namespace `example-item`), registered in `src/messages/index.ts` between the
`registry` markers. Every key is ours (the skeleton replaces no legacy screen);
when a view is named, fill the file from the legacy English packs.

| Key                                            | Used in                                         | Legacy key / ours |
| ---------------------------------------------- | ----------------------------------------------- | ----------------- |
| `noun_example_item`, `noun_example_items`      | the verb + noun labels; the list's failure line | ours              |
| `list_title`, `new_title`, `record_title`      | the titles, the create button, route metadata   | ours              |
| `section_details`, `name`, `enter_name`        | the form                                        | ours              |
| `name_too_long`                                | the form: a name over `EXAMPLE_ITEM_NAME_MAX`   | ours              |
| `errors.ERP-CORE-0004`                         | a permalink to a record that is not there       | ours              |
| `id`, `label`, `created_at`                    | the list's column and the export's header row   | ours              |
| `empty_heading`, `empty_body`                  | the list's empty state                          | ours              |
| `no_match_heading`, `no_match_body`            | the list's no-results state                     | ours              |
| `saved_toast`                                  | the success toast after a save                  | ours              |
| `common.*_noun`, `common.errors.*`, `common.*` | the kit                                         | ours (`common`)   |

`messages/ar.json`: the keys with neutral **unreviewed** placeholder Arabic; the titles and the
noun fall back to English until the customer's translation replaces the file (a data change).

## How to run its tests

```bash
corepack yarn test src/features/example-item
```

Inside the template workspace (erp-docs `05-templates/frontend-feature`): `corepack yarn test`.
DOM tests (`*.test.tsx`) opt into happy-dom with `// @vitest-environment happy-dom` on line 1 and
render through `src/test/render.tsx` (`renderWithProviders(ui, { hasMemory: true })`,
`physicalClassesIn`); the network is a fake adapter on `http.defaults.adapter` and the session is
seeded first (`setSession`), then cleared after `cleanup()`.
