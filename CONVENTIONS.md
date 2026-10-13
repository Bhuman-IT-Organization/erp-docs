# Conventions

The short version of how we work in erp-api, erp-web and erp-infra. The full rules, with what enforces each one, are in [`02-coding-rules/`](02-coding-rules/).

## Branches

| Branch | Purpose |
|---|---|
| `main` | What is released. Protected: changes arrive only through a pull request from `dev` (or a hotfix). |
| `dev` | Integration branch. Every feature, fix and chore branch starts here and goes back here. |
| `feat/<feature-name>` | A new feature, e.g. `feat/tax-rates-export` |
| `fix/<fix-name>` | A bug fix, e.g. `fix/currency-symbol-on-print` |
| `hotfix/<hotfix-name>` | An urgent fix to what is released: branch from `main`, pull request into `main`, then bring `dev` up to date |
| `chore/<chore-name>` | Tooling, dependencies, configuration, e.g. `chore/bump-next` |
| `docs/<docs-name>` | Documentation only, e.g. `docs/cost-centers-readme` |
| `refactor/<refactor-name>` | Code change with no behaviour change |
| `test/<test-name>` | Adding or fixing tests only |

- Names are lowercase kebab-case after the slash.
- One task per branch. Keep it small enough to review in one sitting.
- Never push to `main` or `dev` directly. Open a pull request into `dev` and merge it with **Rebase and merge** once it is approved.
- History is rebase-only: no merge commits. Run `git config --global pull.rebase true` and `git config --global merge.ff only` once. The installed git hooks refuse a direct push to `main` and any merge commit.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/en), **with a scope**: `type(scope): what and why`. The commit-msg hook (commitlint) rejects anything else.

| Type | Use it for | Example |
|---|---|---|
| `feat` | a new feature | `feat(taxes): export the list to Excel` |
| `fix` | a bug fix | `fix(currencies): keep the symbol on the print view` |
| `refactor` | a code change with no behaviour change | `refactor(identity): split the member service` |
| `test` | adding or updating tests | `test(cost-centers): cover the delete refusal` |
| `docs` | documentation only | `docs(readme): add the Docker memory note` |
| `chore` | tooling, dependencies, configuration | `chore(deps): bump next to 16.3.8` |
| `style` | formatting only | `style(web): apply prettier` |
| `perf` | a performance improvement | `perf(identity): index the members search` |
| `build` / `ci` | build or pipeline changes | `ci(api): run check on pull requests` |
| `revert` | reverting an earlier commit | `revert(taxes): undo the export button` |

- The scope is the module or area you touched (`taxes`, `identity`, `auth`, `nginx`, `deps`, …).
- No em dash (—) in the first line; use a colon or a hyphen.
- No `Co-Authored-By` or "Generated with" lines.
- One task per commit. `corepack yarn check` is green in every app you touched before you open the pull request.

## Project structure

### erp-api (backend, NestJS)

- Every module lives in `src/v1/<module>/`, named in **kebab-case** after the screen it serves (`taxes`, `cost-centers`, `payment-modes`).
- Shared, module-free code lives in `src/shared/`; third-party systems are reached through `src/integrations/`.
- Start a new module as a copy of [`05-templates/backend-module`](05-templates/backend-module/) (the same code as `erp-api/src/v1/example-item`), then rename.

Each module folder holds:

| File | Its one job |
|---|---|
| `<module>.module.ts` | the NestJS module wiring |
| `<module>.routes.ts` | the route paths and permission codes, as constants |
| `index.ts` | the public face: the only file another module may import |
| `controller/<module>.controller.ts` | the HTTP entry points: one service call per handler, never catches |
| `service/<module>.service.ts` | orchestrates validator → repository → enricher → transformer |
| `service/<module>.validator.ts` | parses input with zod; a bad request becomes a 400 |
| `service/<module>.transformer.ts` | builds the response field by field |
| `service/<module>.transport.ts` | the only file that leaves the process (mail, queue, HTTP) |
| `repository/<module>.repository.ts` | the only file that talks to the database (Prisma) |
| `facade/<module>.facade.ts` | what other modules may call |
| `dto/<module>.dto.ts` | the zod schemas of every request and response |
| `model/<module>.model.ts` | internal types and constants |
| `events/published.ts`, `events/subscribed.ts` | the events the module sends and listens to |
| `__tests__/` | one spec per layer, plus the controller e2e spec |
| `README.md` | what the module does, its routes, tables and decisions |

Separation of concerns:

- Controllers never talk to the database or call another system; they call their service.
- Only the repository calls Prisma, and only the transport leaves the process.
- A module reaches another module only through that module's `index.ts` (its facade) or through events, never its internals.
- `process.env` is read only in `src/shared/config/env.schema.ts`.

### erp-web (frontend, Next.js)

- `app/` holds routes only, no logic: `app/(shell)/setup/<screen>/page.tsx`.
- Every feature lives in `src/features/<feature>/` (kebab-case), with:

| Folder / file | Holds |
|---|---|
| `api/<feature>.endpoints.ts` | the API paths the feature calls |
| `hooks/use-<thing>.ts` | data hooks (SWR) |
| `schemas/<feature>.schema.ts` | zod schemas for forms and responses |
| `components/<Name>.tsx` | the feature's components, each with a `.stories.tsx` |
| `pages/<Name>Page.tsx` | the screens the routes render |
| `messages/en.json`, `messages/ar.json` | every label and message, per language |
| `index.ts`, `README.md` | the public face and the feature's documentation |

- Shared UI lives in `src/components/` as `atoms/`, `molecules/`, `organisms/` and `templates/`. A lower layer never imports a higher one.
- Only `src/lib/api/http.ts` talks to axios; everything else goes through it.
- Start a new feature as a copy of [`05-templates/frontend-feature`](05-templates/frontend-feature/), then rename.

## Controller structure

Copy the template's controller. Every handler declares its route, its guards, its permission and its OpenAPI description, and returns what the service returns:

```ts
@Controller(EXAMPLE_ITEM_ROUTES.base)
export class ExampleItemController {
  constructor(private readonly service: ExampleItemService) {}

  /** `GET /api/v1/example-item?limit&cursor&q&sort` → the list envelope. */
  @Get(EXAMPLE_ITEM_ROUTES.list)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @PermissionsAny(EXAMPLE_ITEM_PERMISSIONS.view, EXAMPLE_ITEM_PERMISSIONS.viewOwn)
  @ApiZod({
    summary: 'List ExampleItem records (keyset paging, one sort, q)',
    query: listExampleItemsQuerySchema,
    responses: { [HTTP_STATUS.OK]: exampleItemListResponseSchema },
    errors: ['ERP-VALIDATION-0001', 'ERP-AUTH-0004', 'ERP-AUTH-0005'],
  })
  list(
    @Query() query: unknown,
    @Scope() scope: ReadScope,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExampleItemListResponseDto> {
    return this.service.list(query, scope, user.staffId);
  }
}
```

- Routes live under `/api/v1`. The OpenAPI (Swagger) docs are at <http://localhost:8088/api/v1/docs> (see README, Developer tools).
- Input arrives as `unknown` and is parsed by the validator, never trusted as typed.
- The handler never catches: errors are thrown as `AppError` and the shared filter answers them.

## Response structure

### Success

A single record is a bare body:

```json
{ "id": "7", "name": "VAT", "rate": "5.00" }
```

A list is `{ data, meta }` and pages with an opaque cursor (`?limit=<1..50>&cursor=...`), not page numbers:

```json
{
  "data": [{ "id": "7", "name": "VAT", "rate": "5.00" }],
  "meta": { "nextCursor": "eyJpZCI6N30", "prevCursor": null, "total": 12, "rangeStart": 1 }
}
```

The request id is never in a body; it travels in the `x-request-id` response header.

### Error

Every error is RFC 9457 problem details (`Content-Type: application/problem+json`) with a stable code:

```json
{
  "type": "about:blank",
  "status": 409,
  "title": "The tax is still in use",
  "detail": "The tax is still in use",
  "code": "ERP-TAXES-0001"
}
```

- `code` is `ERP-<AREA>-<NNNN>` and comes from `ERROR_CODES` in `src/shared/errors/error-codes.ts`. Add a new code there; never invent one inline.
- Throw `new AppError(code, detail?)`. Never throw a NestJS `HttpException` and never build an error body by hand.

### Validation error

- Validation runs first, before any database call or other work.
- Requests are parsed with the zod schemas in `dto/`. A failure is a **400** with code `ERP-VALIDATION-0001` and an `issues` list naming each bad field.
- Forms in erp-web validate with the zod schemas in `schemas/` before sending, and show the api's `issues` on the matching fields.

## Naming

### JSON fields

- camelCase: `companyName`, not `CompanyName` or `company_name`.
- Whole words: `paymentMode`, not `pm` or `payMd` (`id`, `url` and the list query's `q` are the accepted short forms).
- Perfex's own database tables and columns keep their names (`tblcurrencies`, `decimal_separator`); map them to camelCase in the transformer, never on the wire.

### Constants and enum-like values

- We do not use TypeScript `enum`. Use an `as const` object or a string-literal union instead.
- Name module-level constants in UPPER_SNAKE_CASE: `ERROR_CODES`, `TIMINGS`, `TAXES_ROUTES`.
- Error codes follow `ERP-<AREA>-<NNNN>`. Permission codes are dotted paths from `PERMISSIONS` in `packages/contracts` (`accounting.banking.view`); the Setup lists (taxes, currencies, …) are administrator-only and have no permission code.

### Types

- Types, interfaces and classes are PascalCase (lint-enforced): `TaxRate`, `TaxesService`.
- A response type is named after its zod schema: `taxesResponseSchema` → `TaxesResponseDto`, `taxesListResponseSchema` → `TaxesListResponseDto`.

### Files

- erp-api: `<module>.<layer>.ts`, kebab-case: `cost-centers.service.ts`, `cost-centers.repository.ts`.
- erp-web: kebab-case for non-component modules (`call-api.ts`, `taxes.schema.ts`), PascalCase `.tsx` for components (`TaxesList.tsx`), `<Name>Page.tsx` for pages, `use-<thing>.ts` for hooks.
- Tests sit in a `__tests__/` folder next to the code: `*.spec.ts` in erp-api, `*.test.ts(x)` in erp-web.
