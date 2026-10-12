# Backend module template

The one folder a backend module starts from. `05-templates/backend-module/` is a Yarn workspace (`@erp/backend-module-template`) that compiles, lints and tests on its own with erp-api's exact dependency pins, compiler flags and ESLint configuration — so the skeleton it ships, `src/v1/example-item/`, already obeys every layer rule before anyone copies it. It is the source of erp-api's `src/v1/example-item`.

## How to start a module from it

Copy **`src/v1/example-item/`** into `erp-api/src/v1/<name>/`, then rename the four spellings of the name and the same four of its plural, everywhere they appear (paths, identifiers, strings, the README):

| Token          | Example for `attendance-log`                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `example-item` | `attendance-log`                                                                                                     |
| `ExampleItem`  | `AttendanceLog`                                                                                                      |
| `EXAMPLE_ITEM` | `ATTENDANCE_LOG`                                                                                                     |
| `exampleItem`  | `attendanceLog`                                                                                                      |
| `ExampleItems` | `AttendanceLogs` (as `listAttendanceLogsQuerySchema`; `exampleItems`, `EXAMPLE_ITEMS`, `example-items` the same way) |

The plural comes from the name (a small rule set on the last hyphen segment): a singular name gets its plural (`attendance-log` gives `attendance-logs`) and a plural name is its own plural, so a module named `taxes` gets `listTaxesQuerySchema`, never `listTaxessQuerySchema`. An irregular word takes its singular by hand (`people` with the singular `person`). No other spelling of the module name appears in the skeleton; any other spelling would survive the rename and is a template bug.

The skeleton is written from `v1/auth`'s patterns (`v1/branding` is the smallest built module in the same shape): every entry of the module-shape allowlist (`<m>.module.ts`, `<m>.routes.ts`, `index.ts`, `README.md`, `controller/`, `service/`, `repository/`, `model/`, `dto/`, `events/`, `facade/`, `__tests__/`), the four optional service layers (validator, enricher, transformer, transport), `events/published.ts` + `subscribed.ts`, a README with the ten mandatory headings and the three `## Resilience` bullets, and one spec per layer under `__tests__/` — 27 files.

It serves exactly what the frontend template's screens call, so a module and a feature copied with the same name work together the day they are copied: `GET /api/v1/example-item` (BE-19's keyset list: `limit`, `cursor` both ways, `q`, one-segment `sort`, the superset meta with `exportLimit` and `printLimit`), `GET …/:id`, `POST …`, `PATCH …/:id` and the export `GET …/export` in CSV, Excel, PDF and print rows through the shared core `shared/http/export.ts`, which takes the ticked rows as `key` (the repository AND-s them with `q` and the row scope). There is no delete. Every handler carries `@UseGuards(JwtAuthGuard, PermissionGuard)`: the reads and the export `@PermissionsAny(view, viewOwn)` with `@Scope()`, create `@Permissions(create)`, update `@Permissions(edit)`, and `__tests__/route-gates.spec.ts` classifies every method against the three screens. The codes are the module's own `example-item.*` names, in no `@erp/contracts` catalogue, so only an administrator holds them until they are declared — the same fail-closed default as the `ADMIN_GATE` a copy of the frontend template declares in erp-web's `ROUTE_GATES`.

No table is invented. The repository keeps its rows in a bounded in-memory store (`EXAMPLE_ITEM_MEMORY_MAX_ROWS`) behind the interface a table would have — `list`, `count`, `findById`, `create`, `update` — and never touches Prisma; its doc comment shows the one-call-per-method swap to the Prisma delegate. Every other layer does real work: the strict zod bodies (`id`, `createdAt`, `internalRef`, `ownerStaffId` are a 400 naming the key), the one not-found code `ERP-CORE-0004` (a missing row and a row the `own` scope hides get the same 404), a field-by-field transformer parsed through the response schema (the internal fields never leave, the id is a string on the wire), `ExampleItemCreatedV1` / `ExampleItemUpdatedV1` through the transport, the facade and the controller.

To give the module a table: claim it in erp-api's `prisma/ownership.json` (owner `node`), run `corepack yarn db:generate` in erp-api, inject `PrismaService` and replace the store with the delegate calls the repository's doc comment shows, and add `__tests__/<name>.repository.int.spec.ts` (erp-api's module-shape spec requires it as soon as the repository reads `this.prisma`).

## What it does not copy

`src/shared/` here is a **stub surface**, not a module: the closure of the skeleton's `../../../shared/…` imports, so the same relative paths resolve inside the template as they will inside erp-api. `shared-manifest.json` lists it in two kinds:

- `copied` — 28 byte-identical copies of `erp-api/src/shared/<same path>` (config, errors, events, the guards and decorators, the request-id hook, the logger, and the list and export helpers the skeleton imports: `http/pagination.ts`, `http/keyset.ts`, `http/csv.ts`, and the export core `http/export.ts` with its writers `http/export-display.ts`, `http/xlsx.ts` and `http/pdf.ts`). The writers' libraries are pinned in this workspace's `devDependencies` at erp-api's versions: `write-excel-file` 4.1.1, `pdfkit` 0.20.2 and `@types/pdfkit` 0.17.6. Never edit them here; change erp-api and re-copy.
- `stubs` — `db/prisma.service.ts`, hand-written and headed `STUB`. Nothing in the skeleton imports it (the store is in memory); it is the path the Prisma swap injects. Inside erp-api the same path is the real `PrismaService`, whose client is the generated Prisma client wrapped by the ownership guard: a `SELECT` passes, a write to a table the register does not give to `node` is rejected. A module that compiles here has not been admitted by that guard; erp-api's own typecheck and the ownership register decide that.

`src/reset.d.ts` and `src/ambient.d.ts` are copies of erp-api's (needed because `skipLibCheck` is `false`). `configs/` is a byte copy of the `configs/` in erp-api and erp-web, and `tsconfig.json` and `eslint.config.mjs` consume it through `"@erp/configs": "link:./configs"`; `eslint.config.mjs` has erp-api's shape plus `src/**/*.int.spec.ts` in its `ignores`. The ESLint block and the compiler flags change in `configs/` and are re-copied (`configs/README.md`).

## How to verify

From this folder (Yarn 4 via corepack; never `npx`):

```bash
corepack yarn typecheck   # tsc --noEmit, erp-api's flags
corepack yarn lint        # eslint . under a 6 GB heap (node --max-old-space-size=6144, every OS), erp-api's config incl. the architecture block
corepack yarn test        # vitest run: one spec per layer, the in-process e2e spec
```

## Why there is no int spec

The skeleton reads no database, so there is no SQL to prove: `__tests__/example-item.repository.spec.ts` proves the in-memory store (the keyset order both ways, the walk forward and back, `total` and `rangeStart`, the `own` narrowing in `list`, `count` and `findById`, the bound). The swap to a table adds `__tests__/<name>.repository.int.spec.ts`, which builds the real `PrismaService`, needs the local stack and runs in erp-api only with `corepack yarn test:int`; the template keeps `*.int.spec.ts` out of its `tsconfig.json`, its ESLint `ignores` and its Vitest `exclude` for that reason.

## What keeps the template and erp-api aligned

- `src/v1/__tests__/example-item-is-generated.spec.ts` (erp-api): erp-api's `src/v1/example-item` equals a copy of this template, file by file (sha256). Fix a failure by changing the template, then copying `src/v1/example-item/` into `erp-api/src/v1/example-item/` and `corepack yarn format:write` in erp-api.
- `src/v1/__tests__/module-shape.spec.ts` (erp-api): the tree, the README headings, the events catalog and the spec-per-layer duty of every module, the copied ones included.

Change the template, copy it again into erp-api's `v1/example-item`, never edit the copy.
