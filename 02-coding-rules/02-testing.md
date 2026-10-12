# Testing

- **Applies to:** erp-api, erp-web
- **Status:** complete
- **Enforced by:** see each rule

Vitest in every repository, test file placement and naming, what each layer must test, the coverage gate with its ratchet, mutation testing, and test hygiene. Written from the configs and the two repositories as built (2026-09-28).

## Rule format

Every rule in this file follows the same shape:

- **Rule:** one imperative sentence.
- **Where:** the folder or file it applies to.
- **Enforced by:** lint rule, CI check, or review checklist item.
- **Instead:** the pattern to use.

## Rules

### TEST-01 Test with Vitest 5 and the shared defaults of `configs/vitest/base.mjs`; never Jest

- **Rule:** Write every test for Vitest 5, run it through a Vitest config that spreads `test` and `coverage` from `@erp/configs/vitest/base`, and never add Jest.
- **Where:** `vitest.config.mts` of erp-api, erp-web and the frontend template (the defaults live in `configs/vitest/base.mjs`).
- **Enforced by:** `corepack yarn test` in each repository.
- **Instead:** `vi.fn()`, `vi.mock()` and `vi.useFakeTimers()`; erp-api keeps its SWC plugin for Nest decorator metadata; an erp-web DOM test opts in with `// @vitest-environment happy-dom` on its first line (FE-05).

### TEST-02 Put every test in a `__tests__/` folder beside its code

- **Rule:** Put every test in a `__tests__/` folder beside the code it tests, named `*.spec.ts` in erp-api, `*.test.ts` or `*.test.tsx` in erp-web, and `*.int.spec.ts` when it needs the local stack.
- **Where:** erp-api `src/` and `packages/*/__tests__/`; erp-web `src/` (the root `__tests__/` holds the tests of Next's root files, such as `proxy.ts`).
- **Enforced by:** `src/__tests__/test-placement.spec.ts` (erp-api), `src/__tests__/feature-shape.test.ts` (erp-web), and each `vitest.config.mts` `include` (a misnamed file never runs).
- **Instead:** `src/v1/auth/__tests__/auth.service.spec.ts` and `auth.repository.int.spec.ts` beside the module's layers; an integration test runs with `corepack yarn test:int` against the local stack (erp-api `vitest.int.config.mts`), never in `test`.
- **Why:** `02-coding-rules/05-backend.md` BE-21 and `02-coding-rules/06-frontend.md` FE-05 name the file per layer.

### TEST-03 Test each layer for its own duty

- **Rule:** Give every layer file the test its duty calls for, as the table below states.
- **Where:** every module of erp-api `src/v1/` and `src/shared/`, every feature of erp-web `src/features/`, and erp-web `src/lib/` and `src/components/`.
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` (erp-api: a spec for every layer file present, an e2e spec for the controller, an int spec for the repository), `src/__tests__/feature-shape.test.ts` (erp-web: a test per kind and a story per component), `corepack yarn test:coverage` (TEST-04), `corepack yarn check:a11y` (every story).
- **Instead:** Test through the layer's own seam (a fake port, a fake adapter, a story), never through a real database, network or clock in `test`.

| Layer | The test proves | Where |
|---|---|---|
| validator, zod schema, DTO | every accepted input and every refusal, with the error it names | erp-api `service/*.validator.ts`, `dto/*.ts`; erp-web `features/*/schemas/` |
| service | its behaviour through fakes of its ports (repository, facade, transport), never a database | `service/*.service.ts` |
| enricher, transformer | every field it writes | `*.enricher.ts`, `*.transformer.ts` |
| repository | its queries against the local stack | `*.int.spec.ts`, `corepack yarn test:int` |
| transport | timeout, retry and breaker, through a fake | `transport/` |
| controller | the HTTP contract, end to end in-process | `*.controller.e2e.spec.ts` |
| hook | a render with a fake api: a 500 read is retried, a 400 is not, a mutation never is | erp-web `hooks/` |
| component | a story per state (audited by `check:a11y`) and a DOM test | erp-web `components/` |
| permission code | allow and deny for every code | erp-api guards, `route-gates.ts`, erp-web HOCs |

### TEST-04 Hold coverage per layer at or above its gate, and only ever raise a gate

- **Rule:** Keep line and branch coverage at or above every threshold in your repository's `vitest.config.mts`, and only ever raise a threshold.
- **Where:** erp-api and erp-web `vitest.config.mts` `coverage.thresholds`, over an explicit `coverage.include` so an untested file counts as zero.
- **Enforced by:** `corepack yarn test:coverage` (V8; in `corepack yarn check:phase`, run at each phase close; `corepack yarn check` and pre-push run plain `test` (lead 2026-10-05)), which fails naming the glob that fell below its threshold.
- **Instead:** Add the missing test. To raise a gate, run `corepack yarn test:coverage`, floor the layer's new value and write it into `thresholds` in the same PR; never lower a threshold and never add a path to `exclude` to pass.
- **Why:** higher bars where bugs cost most, each repository starting at its measured level.

The gates, lines / branches, measured and floored on 2026-09-28:

| erp-api glob | Gate | erp-web glob | Gate |
|---|---|---|---|
| global | 87 / 78 | global | 92 / 91 |
| `src/v1/**/service/*.service.ts` | 98 / 89 | `src/features/**/schemas/**` | 97 / 90 |
| `src/v1/**/service/*.validator.ts` | 96 / 84 | `src/features/**/hooks/**` | 100 / 100 |
| `src/v1/**/service/*.{enricher,transformer}.ts` | 100 / 86 | `src/lib/hooks/**` | 98 / 91 |
| `src/v1/**/dto/*.ts` | 100 / 100 | `src/lib/api/**` | 100 / 93 |
| `src/shared/http/guards/**` | 100 / 100 | `src/lib/auth/**` | 100 / 100 |
| `packages/contracts/src/**` | 92 / 77 | `src/hocs/**` | 100 / 95 |
| | | `src/config/**` | 100 / 94 |
| | | `src/lib/i18n/**` | 97 / 94 |

### TEST-05 Run mutation testing on the critical layers weekly and on demand, and only ever raise `thresholds.break`

- **Rule:** Once mutation testing is unparked, run it on the critical layers weekly and on demand, never in a hook or `check`, and only ever raise `thresholds.break`.
- **Where:** erp-api and erp-web `stryker.config.mjs` (`mutate`: erp-api services, validators, enrichers, transformers, `dto/`, `src/shared/http/guards/` and `packages/contracts/src/`; erp-web `src/features/**/schemas/`, `src/lib/auth/`, `src/config/` without `route-gates.ts`, and `src/lib/i18n/format.ts`); reports go to the gitignored `reports/`.
- **Enforced by:** `corepack yarn test:mutation` (Stryker 10, by hand; the dormant `.github/workflows/mutation.yml` runs it once CI is switched on). PARKED: `@stryker-mutator/vitest-runner` 10.0.0 runs no tests per mutant under Vitest 5.0.1, so no score is valid, none is claimed, and `thresholds.break` is `null` in both repositories.
- **Instead:** To unpark: a runner release (or a `.yarn/patches` fix) under which erp-api's `src/shared/http/guards/permission.guard.ts` kills mutants; then one full run per repository, `break` set to its floored score, and the weekly run started (by hand until CI is switched on, then by the workflow's `schedule`). erp-web's `route-gates.ts` returns to `mutate` once `src/config/__tests__/route-gates.test.ts` finds its markers after `export const ROUTE_GATES` in an instrumented file.
- **Why:** weekly and on demand, the score only goes up.

### TEST-06 Commit no focused, skipped or assertion-free test

- **Rule:** Commit no focused, skipped, assertion-free or duplicate-titled test.
- **Where:** every test file in erp-api and erp-web.
- **Enforced by:** `vitest/no-focused-tests`, `vitest/no-disabled-tests` (an error), `vitest/expect-expect` and `vitest/no-identical-title` (`configs/eslint/backend.mjs`, `configs/eslint/frontend.mjs`), `corepack yarn lint`.
- **Instead:** Fix the test or delete it when it no longer applies; a slow test gets its own timeout with a one-line measured reason, never a skip; the one skipped erp-api test at switch-on is a `REFACTOR-BACKLOG.md` row (TS-18).
