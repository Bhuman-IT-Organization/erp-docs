# Frontend feature template

The one folder pair an erp-web feature starts from. `05-templates/frontend-feature/` is a Yarn workspace (`@erp/frontend-feature-template`) that typechecks, lints, tests and builds its stories on its own with erp-web's exact dependency pins, compiler flags, ESLint configuration (including the architecture block) and Storybook setup, so the skeleton it ships, `src/features/example-item/` + `app/(shell)/example-item/`, already obeys every frontend rule before anyone copies it.

## How to start a feature from it

Copy **`src/features/example-item/` and `app/(shell)/example-item/`** into `erp-web/src/features/<name>/` + `erp-web/app/(shell)/<name>/` (the shell's route group, so the screens get the sidebar and the topbar), then rename the four code spellings of the name, the snake, words and sentence of its singular, and all seven of its plural, everywhere they appear (paths, identifiers, strings, the README, the message namespace and keys, the prose):

| Token           | Example for `stock-adjustment`                                                         | Example for `expense-categories`                      |
| --------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `example-item`  | `stock-adjustment`                                                                     | `expense-categories`                                  |
| `ExampleItem`   | `StockAdjustment`                                                                      | `ExpenseCategories`                                   |
| `EXAMPLE_ITEM`  | `STOCK_ADJUSTMENT`                                                                     | `EXPENSE_CATEGORIES`                                  |
| `exampleItem`   | `stockAdjustment`                                                                      | `expenseCategories`                                   |
| `example_item`  | `stock_adjustment` (message keys: `noun_stock_adjustment`)                             | `expense_category` (`noun_expense_category`)          |
| `example item`  | `stock adjustment` (the noun in prose: "Create stock adjustment")                      | `expense category` ("Create expense category")        |
| `Example item`  | `Stock adjustment` (a title: "Stock adjustment saved")                                 | `Expense category`                                    |
| `example_items` | `stock_adjustments` (`noun_stock_adjustments`)                                         | `expense_categories` (`noun_expense_categories`)      |
| `example items` | `stock adjustments` ("No stock adjustments yet")                                       | `expense categories`                                  |
| `Example items` | `Stock adjustments` (the list title)                                                   | `Expense categories`                                  |
| `ExampleItems`  | `StockAdjustments` (and `exampleItems`, `EXAMPLE_ITEMS`, `example-items` the same way) | `ExpenseCategories` (a plural name is its own plural) |

The singular and the plural come from the name (a small rule set on the last hyphen segment: `taxes` gives `tax`, `currencies` gives `currency`, and a singular name gets its plural, `example-item` gives `example-items`), so "Create tax" and "Taxes" read right. Code identifiers, file names, the namespace, the routes and the api paths keep the name's own spelling (`ExpenseCategoriesForm`, `/api/v1/expense-categories`); a singular model type (`ExpenseCategory`) is still a hand rename. An irregular word takes its singular by hand (`people` with the singular `person` gives `noun_person` and `noun_people`). No other spelling of the name appears in the skeleton; any other spelling would survive the rename and is a template bug.

Then register the feature's message packs in erp-web's `src/messages/index.ts` between the four `// registry start: <block>` … `end: <block>` marker pairs (`imports`, `namespaces`, `en`, `ar`), and declare its three routes (`/<name>`, `/<name>/new`, `/<name>/:id`) in `src/config/route-gates.ts` between the `route-gates` pair inside `ROUTE_GATES`. Then the remaining manual steps: fill the README's parity table and drops, check the singular and the plural noun keys; declare the same three routes in erp-api `packages/contracts/src/route-gates.ts` and in erp-web's `route-gates.test.ts`; `corepack yarn check` in erp-web.

**The template's gate is `ADMIN_GATE`: a copied screen is administrator-only until its module declares its own view code** (fail closed). Replace `ADMIN_GATE` with the module's view permission in erp-web `src/config/route-gates.ts` AND in erp-api `packages/contracts/src/route-gates.ts` once the code exists.

The skeleton is built on the base UI kit, as it is on erp-web `main`: the list is `ListPageTemplate` (URL state through nuqs, the settled search, keyset sort, the sticky pager, the Export menu (CSV, Excel, PDF and Print, ticked rows included) as `{ path, columns, labels, blanks? }` with one label per export column, every state in the fixed order), the form is `SchemaForm` (one section, a required `name`) with the save summary and the discard question in `ConfirmDialog`, `useUnsavedChanges`, the return to the exact list URL (`readListReturn`), the saved row swapped into the cached list after an edit and the list pages revalidated after a create, and a success toast. Both are exported as `withAuth(withPermission(…, { skeleton }), { skeleton })`, which read `ROUTE_GATES` through `usePathname`. The labels are `common.create_noun` / `save_noun` with the feature's `noun_example_item`. The routes are Server Components that read nothing (`force-dynamic`, ≤ 30 lines); a record route `[id]` passes its id. `messages/en.json` + `ar.json` are keyed by the feature name, the README has the eight headings, there is a test per api/schema/hook/component file under `__tests__/` and a story per component. Every screen state ships (FE-27): the list's `Loading`, `Empty`, `Error`, `Loaded` and the form's `Pending`, `FieldErrors`, `ServerError` are each an `it` and a story export, plus `Rtl` for both. Dates go through `@/lib/i18n/format` (FE-26); classes are logical so RTL is a locale switch (FE-20).

## What it does not copy

Everything else in this workspace is a **stub surface**, not a feature: the closure of the skeleton's `@/components/**`, `@/hocs/**`, `@/config/**`, `@/lib/**`, `@/i18n/**`, `@/test/**` and `@/messages` imports plus the config files, so the same paths resolve inside the template as they will inside erp-web. `web-manifest.json` lists it in two kinds:

- `copied`: byte-identical copies of `erp-web/<same path>` (the kit: every feature-building component's `<Name>.tsx` and `index.ts` under `src/components/{atoms,molecules,organisms,templates}` (never its stories or tests) with `src/assets/icons/registry.json`; `src/hocs/{withAuth,withPermission}.tsx`; the data layer `src/lib/api/*`, `src/lib/{log.ts,utils.ts}`, `src/lib/i18n/{pick,format,format.server}.ts`, `src/lib/auth/{session,use-permissions,safe-next}.ts`, `src/lib/hooks/*`, `src/lib/url/*`, `src/lib/errors/*`, `src/lib/config/*`, `src/i18n/{locales,direction,locale-cookie}.ts`, `src/messages/common/*`, `src/test/*`, the shadcn primitives + `.manifest.json`, `.storybook/*`, the six `.yarn/patches/*`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vitest.config.mts`, `components.json`, `postcss.config.mjs`, `prettier.config.mjs`, `.prettierignore`, `reset.d.ts`, `app/globals.css`, `app/error.tsx`). Never edit them here; change erp-web and re-copy.
- `stubs`: five hand-written files headed `STUB`: `app/layout.tsx` (`lang`/`dir` + `NextIntlClientProvider` with the whole pack + `SwrProvider`; erp-web's also fetches the brand and mounts the unreachable banner), `src/i18n/request.ts` (cookie → `en`; erp-web's falls back to `branding.defaultLocale`), `src/messages/index.ts` (the registry: `common` + `example-item`, with the same markers erp-web's carries), `src/config/route-gates.ts` (erp-web's signatures, only the skeleton's three routes on `ADMIN_GATE` between the same `route-gates` markers), `src/config/permissions.ts` (the `PermissionCode` type only, the one thing `use-permissions.ts` imports; erp-web's is the 507-code catalogue, which changes with every module, so a byte copy would go stale each time a module declares its codes). The shell's own organisms (`Sidebar`, `Topbar`, `AccountMenu`, `PageShell`, `NavItemLink`, `Breadcrumbs`, `ApiUnreachableBanner`) are not copied: a feature renders inside the shell, never builds it.

`eslint.config.mjs`, `tsconfig.json`, `prettier.config.mjs` and `.prettierignore` are erp-web's thin consumer files: they read the ESLint architecture block, the TypeScript flags and the Prettier options from `configs/`, this workspace's byte copy of the `configs/` in erp-api and erp-web (`"@erp/configs": "link:./configs"`). `installConfig.hoistingLimits: "workspaces"` keeps the workspace's `node_modules` self-contained, which is the flat layout Storybook's framework preset needs.

## Seeding a migrated screen

Read the legacy view `erp-legacy/public_html/application/views/<module>/<view>.php`, the **one direct read of the legacy tree**: exactly that file. Only two things leave it: the `_l('key')` key names and the `class="…"` tokens; no other text of the view is retained. The English texts come from the legacy language packs, never from the view.

Fill the copied README's `## Legacy screen` (the view path), `## Legacy parity` (one row per class token; the `Component:line` column is the developer's, filled while rebuilding the screen class for class) and `## Messages` (one row per resolved key, plus an "Unresolved legacy keys" list for keys the packs do not carry), and merge the resolved keys into `messages/en.json` over the skeleton's own keys. The keys land as data: erp-web's feature-shape spec then fails until every key is referenced in code; that clause is the to-do list for the rebuild.

## How to verify

From this folder (Yarn 4 via corepack; never `npx`):

```bash
corepack yarn typecheck        # next typegen && tsc --noEmit, erp-web's flags
corepack yarn lint             # eslint . under a 6 GB heap (node --max-old-space-size=6144, every OS), erp-web's config incl. the architecture block
corepack yarn format           # prettier --check .
corepack yarn test             # vitest run: 30 tests, happy-dom per file
corepack yarn storybook:build  # storybook build --test: 13 stories
```

Change the template, never a copy: a fix to the skeleton lands here, then the next copy carries it.
