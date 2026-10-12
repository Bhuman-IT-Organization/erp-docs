# TypeScript safety, ESLint, code shape

- **Applies to:** erp-api, erp-web, @erp/contracts, 05-templates/backend-module, 05-templates/frontend-feature
- **Status:** complete
- **Enforced by:** see each rule

Compiler flags, type discipline, the shared configs, ESLint rules that encode the architecture, code shape (complexity, nesting, loops), config-driven timers, feature flags, circular imports, queries in loops, and the suppression ratchet. Written from `configs/` and the two repositories as built (2026-09-28).

## Rule format

Every rule in this file follows the same shape:

- **Rule:** one imperative sentence.
- **Where:** the folder or file it applies to.
- **Enforced by:** lint rule, CI check, or review checklist item.
- **Instead:** the pattern to use.

## Rules

### TS-01 Compile with the locked strictness flags

- **Rule:** Every TypeScript project compiles with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`, `isolatedModules` and `forceConsistentCasingInFileNames` set to `true`, `skipLibCheck` set to `false`, `target` ES2023 and `lib` ES2024 (so `Object.groupBy` and `Map.groupBy` exist), and loads `@total-typescript/ts-reset`.
- **Where:** `configs/tsconfig/base.json`, extended by `configs/tsconfig/node.json` (erp-api, the backend template) and `configs/tsconfig/next.json` (erp-web, the frontend template), which each consumer's `tsconfig.json` extends (`@erp/contracts` extends erp-api's); the reset is loaded by `src/reset.d.ts` (erp-api) and `reset.d.ts` (erp-web).
- **Enforced by:** `corepack yarn typecheck` in each repo (`tsc --noEmit` after `build:contracts` and `prisma generate` in erp-api; `next typegen && tsc --noEmit` in erp-web, because Next 16 generates route types first; in both, tsc runs as `node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit`, a 4 GB heap set by the script on every OS with no `NODE_OPTIONS`, since each type graph passed the 2 GB default on an 8 GB machine; erp-web's `build` runs `node scripts/build.mjs`, which starts `next build` with `NODE_OPTIONS=--max-old-space-size=4096` so every child process, the type-check worker included, gets the 4 GB heap (a flag on `node` reached only the parent), since that type check passed the 2 GB default from a cold cache).
- **Instead:** Change a flag only in `configs/tsconfig/` and re-copy (TS-06). If a flag must be relaxed for generated code, relax it in that repo's README "Known deviations" with the error count, never silently. A library type error under `skipLibCheck: false` is closed by a one-line ambient alias in `src/ambient.d.ts` with a comment saying when to remove it, not by flipping the flag.
- **Why:** freshers: the compiler decides, not judgement.

### TS-02 No `any`, no non-null assertion, `as` only to `const` or `unknown`

- **Rule:** Do not write `any`, `!` (non-null assertion) or a type assertion `as T` other than `as const` and `as unknown`.
- **Where:** every `.ts` and `.tsx` file in erp-api and erp-web.
- **Enforced by:** typescript-eslint `strictTypeChecked` (`@typescript-eslint/no-explicit-any`, `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-return`, `no-unsafe-argument`, `no-non-null-assertion`) through `corepack yarn lint`.
- **Instead:** Parse the value with zod at the boundary it crosses (HTTP body, env, queue payload, JSON file); inside the app narrow with a type guard (`if ('id' in x)`, a user-defined `is` function) so the type is proven, not asserted.
- **Why:** zod is the one validation library.

### TS-03 Use `import type` for types and `.js` specifiers for relative imports in erp-api

- **Rule:** Import types with `import type { X }` (or inline `type` modifiers), and in erp-api write every relative import specifier with its `.js` extension.
- **Where:** erp-api `src/`; erp-web `src/` and `app/` (the `import type` half only; Next.js bundles, so no `.js` suffix there).
- **Enforced by:** `verbatimModuleSyntax` in `tsc` (a type-only import without `type` is a compile error) and `module: NodeNext` resolution in erp-api (a relative import without `.js` fails to resolve at runtime and in `tsc`).
- **Instead:** `import type { Thing } from './thing.js'` for types; `import { doThing } from './thing.js'` for values; never a bare `'./thing'` in erp-api.
- **Why:** the compiler decides; erp-api is ESM (`"type": "module"`) and Node resolves specifiers literally.

### TS-04 ESLint base is typescript-eslint `strictTypeChecked` + `stylisticTypeChecked` with `projectService`, in a flat `eslint.config.mjs`

- **Rule:** Each repo has exactly one flat `eslint.config.mjs` whose typed base is `tseslint.configs.strictTypeChecked` and `tseslint.configs.stylisticTypeChecked` with `parserOptions.projectService: true`.
- **Where:** `configs/eslint/base.mjs` (every consumer), `configs/eslint/backend.mjs` (erp-api, the backend template) and `configs/eslint/frontend.mjs` (erp-web, the frontend template), spread by the `eslint.config.mjs` at each consumer's root.
- **Enforced by:** `corepack yarn lint` (`node --max-old-space-size=6144 node_modules/eslint/bin/eslint.js .`: the full typed lint needs up to 6 GB of heap, and the script sets it on every OS with no `NODE_OPTIONS`) in each repo, run by `corepack yarn check`.
- **Instead:** Repository-specific rules live in `backend.mjs` or `frontend.mjs`, never in a consumer: erp-api's `@typescript-eslint/no-extraneous-class` with `allowWithDecorator` for Nest modules; erp-web's `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` before the base (erp-web stays on ESLint 9.x until `eslint-plugin-react` supports ESLint 10). A consumer's `eslint.config.mjs` holds only its `ignores`, `base({ ... })` and `backend({ root })` or `frontend({ root })`; generated code (`src/shared/db/generated/**` in erp-api, `src/components/ui/**` in erp-web) is in its `ignores` and never edited.
- **Why:** violations fail CI, not review.

### TS-05 Formatting is Prettier only; ESLint has no style rules

- **Rule:** Format with Prettier (`singleQuote: true`, `semi: true`, `trailingComma: 'all'`, `printWidth: 100`, `endOfLine: 'lf'`) and never add a formatting rule to ESLint.
- **Where:** `configs/prettier.config.mjs`, re-exported by `prettier.config.mjs` at the root of erp-api, erp-web and the frontend template; `.prettierignore` in each; every text file.
- **Enforced by:** `corepack yarn format` (`prettier --check .`) in each repo, run by `corepack yarn check`; the pre-commit `prettier --write` on staged files; `.gitattributes` (`* text=auto eol=lf`) so no CRLF byte reaches a commit.
- **Instead:** Let the pre-commit format the staged files, or run `corepack yarn format:write`; put generated folders in `.prettierignore` instead of formatting them. A formatting disagreement is fixed by changing `configs/prettier.config.mjs` and re-copying (TS-06), never by an `eslint-disable`.
- **Why:** so the two never fight; one task, one commit: formatting noise hides the change.

### TS-06 Take tsconfig, ESLint, Prettier, commitlint, lint-staged, Vitest and the hook chain from `configs/`, never edit a copy

- **Rule:** Take every shared config from `configs/` (the package-shaped `@erp/configs`, linked as `"@erp/configs": "link:./configs"`) and never edit a consumer's byte copy.
- **Where:** `configs/` in erp-api, erp-web, `05-templates/backend-module` and `05-templates/frontend-feature`; the `lefthook.yml` copy at the root of erp-api and erp-web.
- **Enforced by:** review.
- **Instead:** Change the file in `configs/`, then re-copy with the two commands of `configs/README.md` "Never edit a copy" in the same PR; the later switch to an installed package is in `configs/README.md` "Switching to an installed package".
- **Why:** rule sync, no submodules.

### TS-07 Encode each repository's layer graph as disjoint ESLint scopes and prove every scope fires

- **Rule:** Add an import or syntax ban as an entry of an existing scope's list in `configs/eslint/backend.mjs` or `configs/eslint/frontend.mjs` (a `P_*` or `S_*` constant, `P_BANNED_LIBS` or `G_BANNED_LIBS`), never as a new `no-restricted-imports` or `no-restricted-syntax` object, and give every other new concern its own rule id.
- **Where:** `configs/eslint/backend.mjs` (erp-api's fifteen scopes, `02-coding-rules/05-backend.md` "Layers"), `configs/eslint/frontend.mjs` (erp-web's `20 + FEATURES.length` import and syntax scopes plus S13 to S19, `02-coding-rules/06-frontend.md` "Layers").
- **Enforced by:** `no-restricted-imports`, `no-restricted-syntax`, `corepack yarn check:arch` (every scope fires on a probe and every permitted construct stays silent: 119 `ok` lines in erp-api and 194 in erp-web on 2026-09-28).
- **Instead:** A new ban joins a list; a new shape rule gets its own rule id in `configs/eslint/base.mjs` or the `erp` plugin (`configs/eslint/plugin.mjs`); `eslint-plugin-boundaries` is not adopted (see "Not adopted").
- **Why:** the modular monolith's boundaries.

### TS-08 Never leave a promise floating or a union switch unexhausted

- **Rule:** Await, return or `void` every promise, and handle every member of a union in a `switch` (or end it with an exhaustive `never` default).
- **Where:** every `.ts` and `.tsx` file in erp-api and erp-web (the switch check: production sources, tests excluded).
- **Enforced by:** `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises` (typescript-eslint `strictTypeChecked`), `@typescript-eslint/switch-exhaustiveness-check` (`configs/eslint/base.mjs`), `corepack yarn lint`.
- **Instead:** `await` it; `void promise` only where nothing may wait, with a one-line comment saying why; a `switch` over a union lists every member, or its `default` assigns the value to a `never` variable so a new member fails `tsc`.

### TS-09 Name types in PascalCase and files by their layer's grammar

- **Rule:** Name every type, interface, class and enum in PascalCase, and name every file by its layer's grammar.
- **Where:** production sources of erp-api and erp-web (tests excluded).
- **Enforced by:** `@typescript-eslint/naming-convention` (`typeLike` PascalCase, `configs/eslint/base.mjs`), `src/__tests__/feature-shape.test.ts` (erp-web, FE-21), `src/v1/__tests__/module-shape.spec.ts` (erp-api, BE-01).
- **Instead:** `ExampleItemRow`, not `exampleItemRow`; the file grammars of `02-coding-rules/06-frontend.md` FE-21 and `02-coding-rules/05-backend.md` BE-01; a junk-drawer file name (`utils`, `helpers`) is UTIL-01.

### TS-10 Keep a function's cyclomatic complexity at 10 or below

- **Rule:** Keep every function's cyclomatic complexity at 10 or below.
- **Where:** production sources of erp-api, erp-web and both templates (`files` minus `tests` in each `base({ ... })` call).
- **Enforced by:** `complexity` (`['error', 10]`, `configs/eslint/base.mjs`), `corepack yarn lint`.
- **Instead:** Move a group of branches into a named function; replace a long `if` / `else if` chain with a lookup table. Optional chaining and `??` count as branches: the template's `ExampleItemForm.tsx` went from 30 to below 10 with module-level helpers and a `RecordState` component.
- **Why:** a fresher reads one branch at a time.

### TS-11 Nest blocks at most two levels deep; never nest a ternary, never `else` after `return`, never a lonely `if`

- **Rule:** Nest blocks at most two levels deep (an `if` inside an `if` is allowed; the third level, for example a loop, then an `if`, then an `if`, is refused), and never nest a ternary, write `else` after a `return`, or leave an `if` alone inside an `else`.
- **Where:** production sources of erp-api, erp-web and both templates.
- **Enforced by:** `max-depth` (`['error', 2]`), `no-nested-ternary`, `no-else-return` (`allowElseIf: false`), `no-lonely-if` (all in `configs/eslint/base.mjs`), `corepack yarn lint`.
- **Instead:** An early return (a guard clause) or a named helper for the third level; an `if` chain, a lookup table or a small component instead of a nested ternary; `else if` in place of an `else` holding one `if`.

### TS-12 Never nest loops

- **Rule:** Never put a loop or an iteration callback (`map`, `filter`, `forEach`, `some`, `reduce` and the like) inside another loop or iteration callback.
- **Where:** production sources of erp-api, erp-web and both templates.
- **Enforced by:** `erp/no-nested-loops` (`configs/eslint/plugin.mjs`), `corepack yarn lint`.
- **Instead:** Index one side into a `Map` or `Set` first (`Map.groupBy`), or move the inner loop into a named function declared outside the loop (a callback written inside the loop body still counts as nested); a chain (`a.filter(...).map(...)`) or a loop over an already filtered array is not nested.

### TS-13 Take every duration from `TIMINGS` and call timers only in the door files

- **Rule:** Call `setTimeout` and `setInterval` only in a timer door file, with a duration from `TIMINGS`, `CLIENT_TIMINGS` or `SERVER_TIMINGS`.
- **Where:** production sources; the doors, set as `timerDoors` in each `eslint.config.mjs`, are erp-api `src/shared/resilience/**` and `src/shared/health/**`, and erp-web `src/lib/hooks/**` and `src/lib/api/swr-config.ts` (SWR's retry timer).
- **Enforced by:** `no-restricted-globals` and `no-restricted-properties` (the bare call and `globalThis.` / `window.`, `configs/eslint/base.mjs`), `@typescript-eslint/no-magic-numbers` (a literal duration), `corepack yarn lint`.
- **Instead:** A hook in erp-web `src/lib/hooks/` or a helper in erp-api `src/shared/resilience/` owns the timer, and its duration is a named entry of `TIMINGS` (erp-api `src/shared/config/timings.ts`), `CLIENT_TIMINGS` (`src/lib/api/client-timings.ts`) or `SERVER_TIMINGS` (`src/lib/config/server-timings.ts`).

### TS-14 Name a feature flag `SHOULD_ENABLE_<NOUN>` (default false) or `SHOULD_DISABLE_<NOUN>` (a kill switch)

- **Rule:** Name every feature flag `SHOULD_ENABLE_<NOUN>` (default false) or `SHOULD_DISABLE_<NOUN>` (a kill switch), in the one zod-parsed flags file of its repository.
- **Where:** erp-api and erp-web; no flags file exists yet (erp-api `src/shared/config/flags.ts` is reserved in `02-coding-rules/05-backend.md`'s tree).
- **Enforced by:** `erp/flag-naming` (a variable, property, type member or enum member named `ENABLE_*`, `DISABLE_*`, `FF_*`, `FEATURE_FLAG_*` or `SHOULD_*` without one of the two prefixes); the flags file is built by the first module that needs it.
- **Instead:** `SHOULD_ENABLE_CSV_EXPORT`, `SHOULD_DISABLE_LEGACY_LOGIN`; never `SHOULD_EXPORT` or `ENABLE_EXPORT`, and never a flag read from `process.env` outside the flags file.

### TS-15 Never create a circular import

- **Rule:** Never create a circular import, type-only imports included.
- **Where:** erp-api `src` and `packages/contracts/src` (Prisma's generated client `src/shared/db/generated/` is excluded: it is rebuilt on every install and nobody can fix it); erp-web `src` and `app`.
- **Enforced by:** `corepack yarn check:cycles` (dependency-cruiser `no-circular` with `configs/dependency-cruiser.cjs`, in `check`); erp-web's one cycle at switch-on (`src/lib/i18n/format.ts` and `src/lib/i18n/FormatSettingsProvider.tsx`) is in `.dependency-cruiser-known-violations.json`, counted by `corepack yarn check:ratchet`.
- **Instead:** Move the part both files need into a third module that imports neither.

### TS-16 Never query inside a loop

- **Rule:** Never call a repository, the Prisma client or a facade inside a loop or an iteration callback, and never `await` inside a loop.
- **Where:** production sources of erp-api, erp-web and both templates.
- **Enforced by:** `erp/no-query-in-loop` (a call whose member chain names something ending in `repository`, `repo`, `prisma` or `facade`), `no-await-in-loop`, `corepack yarn lint`; counting queries at runtime comes later (`02-coding-rules/07-database.md`).
- **Instead:** Load the set once (`findMany` with `in`, a facade batch method) and index it in a `Map`. Sequential by design is the one justified disable, with its reason: keyset paging, where each page's cursor comes from the previous page (the template's example-item export, BE-19), and erp-api's retry loop in `src/shared/resilience/retry.ts`.

### TS-17 State the cost of a loop in a helper, enricher or transformer with `@complexity`

- **Rule:** Give every function with a loop in a helper, enricher or transformer file a JSDoc `@complexity` line.
- **Where:** `**/utils/**/*.{ts,tsx}`, `**/*.enricher.ts` and `**/*.transformer.ts` (tests excluded).
- **Enforced by:** `erp/require-complexity-note`, `corepack yarn lint`.
- **Instead:** `/** Sums the rows. @complexity O(n) over the rows */` above the function; a function passed straight as an argument has no doc block, so name it, document it, then pass it.

### TS-18 Keep every rule an error; disable one line only with a written reason; never grow the suppressions

- **Rule:** Keep every rule an error, disable one line only with a written reason, and never raise the suppressed total.
- **Where:** erp-api, erp-web and both templates.
- **Enforced by:** `linterOptions.reportUnusedDisableDirectives` `error` (`configs/eslint/base.mjs`), `@eslint-community/eslint-comments/require-description`, `corepack yarn check:ratchet` (the violations at switch-on are ESLint bulk suppressions in `eslint-suppressions.json` plus erp-web's one known cycle, pinned at `--expect 142` in erp-api and `--expect 110` in erp-web on 2026-09-28 and listed per file and rule in the generated `REFACTOR-BACKLOG.md`).
- **Instead:** Fix a backlog row, then `corepack yarn lint:prune`, `corepack yarn check:ratchet --write`, and lower `--expect` in `package.json` in the same commit; a disable reads `// eslint-disable-next-line <rule> -- <reason>`; never baseline a rule whose autofix would run on suppressed code (turn its fixer off, as `jsdoc/require-jsdoc` has `enableFixer: false`, or fix the code).
- **Why:** a ratchet, not a big-bang cleanup.

## Not adopted, and what would bring each back

| Item | What it would catch | Why not now | Trigger |
|---|---|---|---|
| `eslint-plugin-boundaries` | an import across a layer | the scopes of TS-07 and `check:arch` already encode and prove the graph | a boundary the scopes cannot express |
| `eslint-plugin-sonarjs` | cognitive complexity | LGPL-3.0 (the licence family refused for Prisma 7) and it pins TypeScript below 6.1; `complexity` and `max-depth` cover the budget | a permissive release that supports the TypeScript in use |
| `max-params` | long parameter lists | Nest constructor injection takes one parameter per dependency | a parameter list the reviewers keep flagging outside constructors |
| `max-lines-per-function` | long functions | length alone catches nothing `complexity` misses | a long function that `complexity` passes and a review cannot follow |
| `max-depth` 1 | an `if` inside an `if` | the lead kept 2 | the refactor backlog's `max-depth` rows reach zero |
| boolean-prefix naming selector (`is`, `has`, `should`) | a boolean named like a value | a noisy typed selector for a small gain | a bug traced to a misread boolean name |
| `eslint-plugin-check-file` | a misnamed file | `feature-shape.test.ts` and `module-shape.spec.ts` already enforce the grammars (TS-09) | a folder the shape specs do not cover |
| `type-coverage` | an implicit `any` | `strictTypeChecked`'s `no-unsafe-*` rules already refuse it (TS-02) | an `any` that reaches `main` through a gap in those rules |
| `import/no-cycle`, madge | circular imports | dependency-cruiser covers it in `check` (TS-15) | dependency-cruiser dropped |
| query-count middleware, EXPLAIN checks | N+1 at runtime | runtime query checks belong to `02-coding-rules/07-database.md` | — |
