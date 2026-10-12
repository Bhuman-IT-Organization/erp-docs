# Database

- **Applies to:** erp-api, erp-infra
- **Status:** draft
- **Enforced by:** see each rule

Prisma conventions, schema ownership during coexistence, migrations, portability for a later PostgreSQL move, N+1 prevention, indexing.

## Rule format

Every rule in this file follows the same shape:

- **Rule:** one imperative sentence.
- **Where:** the folder or file it applies to.
- **Enforced by:** lint rule, CI check, or review checklist item.
- **Instead:** the pattern to use.

## Rules (minimum)

### DB-01 `prisma/schema.prisma` is a read-only mirror introspected only from the local legacy stack

- **Rule:** Never hand-edit a model in `prisma/schema.prisma`; refresh it only with `corepack yarn db:pull` against the local legacy database at `127.0.0.1:33061`, and commit the result together with the regenerated `prisma/INTROSPECTION.md` and `prisma/model-table-map.json`. The chain normalises the pull's output with `scripts/fix-ignored-relations.mjs` before `prisma format`: `prisma db pull` emits a relation field pointing at an `@@ignore`d model without the field-level `@ignore` the validator then demands (P1012), so the script adds it. That is a normalisation of generated output, not an authored edit — it is idempotent, it touches nothing else, and without it `db:pull` exits 1.
- **Where:** erp-api `prisma/`.
- **Enforced by:** `corepack yarn check:db` (`prisma validate`, regenerate the report, `git diff --exit-code` on `INTROSPECTION.md` and `model-table-map.json`, so a hand edit or a stale report fails, and a DDL file applied without the follow-up `db:pull` shows up as a stale report); the `db:pull` and `db:apply` scripts load only `../erp-infra/env/local/api.host.env`, so neither can point at a shared or production database by accident; `scripts/apply-node-schema.mjs` refuses a file that is not `NNNN-<slug>.sql` and exits non-zero on the first failure, and `erp-infra/scripts/local-up.mjs` fails the whole bring-up when it does, so a broken DDL file cannot be discovered later by the api's boot.
- **Instead:** A table the Node side needs and the legacy schema lacks is a numbered, forward-only DDL file in `erp-api/prisma/sql/` (`NNNN-<slug>.sql`, one purpose per file, naming the decision that requires the table in a leading comment), applied by `corepack yarn db:apply` and by `erp-infra/scripts/local-up.mjs` on every bring-up, then made visible with `corepack yarn db:pull`: never an edit to the mirror; the table is registered in `prisma/ownership-node.json`, never in the generated legacy register. A file that has been applied is never edited: a correction is a new, higher-numbered file, and there is no down path. This is interim: when migrations arrive they convert `prisma/sql/` into the first migration and delete `db:apply`. A naming problem is solved by `@@map` written by `db pull`, not by renaming a model. A legacy column a deployment lacks is a guarded `ADD COLUMN` in a DDL file, its type copied from the deployment's patch.
- **Why:** keep the existing MySQL, Prisma; the legacy schema is frozen during coexistence; `03-architecture/05-strangler-fig-migration.md` (shared DB, read-only mirrors allowed).

### DB-02 The ownership registers live in erp-api `prisma/` and are edited there

- **Rule:** The three registers are `prisma/ownership.json`, `prisma/ownership-node.json` and `prisma/ownership-cowrites.json` (the recorded co-writes). erp-api holds the only copies; there is no copy check. Make ownership and co-write decisions by editing these files, in the same change as the code that needs them.
- **Where:** erp-api `prisma/ownership.json`, `prisma/ownership-node.json`, `prisma/ownership-cowrites.json`.
- **Enforced by:** the boot load refuses a table named in both ownership registers and a co-write record for a node-owned table (`src/shared/db/__tests__/ownership.spec.ts`, `src/shared/db/__tests__/ownership-cowrites.spec.ts`); the ownership guard rejects a write to a table the union does not give to `node`.
- **Instead:** To claim a table for `node`, change its owner in `prisma/ownership.json` (or add it to `prisma/ownership-node.json` if Node created it) in the same change as the module that writes it.
- **Why:** one writer system per table; one writer module.

### DB-03 Outside production the Prisma client is wrapped by the ownership guard

- **Rule:** Obtain the Prisma client only from `PrismaService`, whose client is extended by the ownership guard that rejects every write (`create*`, `update*`, `upsert`, `delete*`, `$executeRaw*`, and any non-SELECT `$queryRaw*`) to a table whose owner in `prisma/ownership.json` is not `node`; `OWNERSHIP_GUARD=off` is refused unless `NODE_ENV=production`.
- **Where:** erp-api `src/shared/db/` (`prisma.service.ts`, `ownership.ts`, `ownership-guard.ts`) and `src/shared/config/env.schema.ts`.
- **Enforced by:** `src/shared/db/__tests__/ownership-guard.spec.ts` (decision table, no database) and `src/shared/db/__tests__/ownership-guard.int.spec.ts` (against the local legacy database, `corepack yarn test:int`), both in CI; `env.schema.ts` throws at boot when `OWNERSHIP_GUARD=off` outside production.
- **Instead:** Claim the table in the register first (cutover ticket, DB-02), then write; a write that must land on a table another module owns goes through that module's facade or an event (BE-04), never through a guard bypass. A write into a table another module owns is a record of `ownership-cowrites.json`, never a guard switch.
- **Why:** `03-architecture/05-strangler-fig-migration.md` "second line of defence".

### DB-04 Only `repository/` files and `src/shared/db` import the generated Prisma client

- **Rule:** Import from `src/shared/db/generated` (or `@prisma/client`) only inside `src/v1/<module>/repository/*.repository.ts` and `src/shared/db/**`; services, enrichers, controllers and tests outside those folders never see Prisma types.
- **Where:** erp-api `src/**`.
- **Enforced by:** `no-restricted-imports` in `configs/eslint/backend.mjs` (`@prisma/client`, `**/shared/db/generated/**` and `**/shared/db/prisma.service.js` are refused outside `repository/` and `shared/db/`; DB-04, BE-08), proven on every erp-api `check` by `corepack yarn check:arch`.
- **Instead:** The repository maps Prisma rows to the module's `model/` types and returns those; a second module needs the owner's facade (BE-03), not its Prisma model.
- **Why:** only repository may import Prisma; extraction: the repository is the only file that changes when the data moves.

### DB-05 Prisma is pinned exactly; upgrading it is an ADR

- **Rule:** Pin `prisma` and `@prisma/client` to the exact same version (`6.19.3` today) with no caret, and do not install a Prisma major, `@prisma/adapter-*` or `mariadb` without an ADR.
- **Where:** erp-api `package.json` and `yarn.lock`.
- **Enforced by:** review checklist: exact pins in `package.json`, `grep -c '"mariadb@' yarn.lock` prints `0`, and `corepack yarn install --immutable` passes in CI and the Dockerfile.
- **Instead:** `corepack yarn add prisma@<exact> @prisma/client@<exact>` for a patch or minor inside 6.x with `corepack yarn check:db` green; a major (Prisma 7 drops the built-in MySQL driver for an adapter that depends on `mariadb`, LGPL-2.1) is a new ADR first.
- **Why:** permissive licences only; a `latest` tag can resolve to a release candidate.
