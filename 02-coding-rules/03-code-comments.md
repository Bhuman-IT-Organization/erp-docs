# Code documentation

- **Applies to:** erp-api, erp-web, @erp/contracts
- **Status:** complete
- **Enforced by:** see each rule

TSDoc on the door surface, generated documentation (OpenAPI, Storybook), the module and feature README, and the comments the code must carry. Written from the configs and the two repositories as built (2026-09-28).

## Rule format

Every rule in this file follows the same shape:

- **Rule:** one imperative sentence.
- **Where:** the folder or file it applies to.
- **Enforced by:** lint rule, CI check, or review checklist item.
- **Instead:** the pattern to use.

## Rules

### DOC-01 Document every export of a door file with TSDoc

- **Rule:** Give every exported function, arrow function, class, interface and type alias of a door file a TSDoc block.
- **Where:** erp-api `src/shared/**`, `src/v1/*/facade/*.ts` and `packages/contracts/src/**`; erp-web `src/lib/**` (the `docSurface` of each `eslint.config.mjs`, tests excluded).
- **Enforced by:** `jsdoc/require-jsdoc` (`publicOnly`, `enableFixer: false`, `configs/eslint/base.mjs`), `corepack yarn lint`, `corepack yarn check:ratchet` (the undocumented exports at switch-on, 59 in erp-api and 51 in erp-web, are `REFACTOR-BACKLOG.md` rows).
- **Instead:** One or two lines saying what the export is for and what it refuses, with `@param` or `@returns` only where the name and the type do not say it; never an empty `/** */` (the rule's fixer is off because an empty stub is not documentation, TS-18).

### DOC-02 Generate API and component docs; never hand-write a duplicate

- **Rule:** Take API documentation from the OpenAPI document erp-api generates at boot and component documentation from Storybook, and never hand-write a copy of either.
- **Where:** erp-api every route (served at `/api/v1/docs` and `/api/v1/openapi.json`, off in production); erp-web every component.
- **Enforced by:** `src/v1/__tests__/openapi-covers-routes.spec.ts` (erp-api: every route has an operation with its schemas and error codes), `corepack yarn storybook:build` and `corepack yarn check:a11y` (erp-web, both in `check:phase` at each phase close (lead 2026-10-05)).
- **Instead:** `@ApiZod` on every handler (`02-coding-rules/05-backend.md` BE-23); a story per component state (`02-coding-rules/06-frontend.md` FE-23); a README links to the generated page instead of copying it.

### DOC-03 Give every module and feature a README with the required headings

- **Rule:** Give every erp-api module and every erp-web feature a `README.md` with the required headings in their order.
- **Where:** erp-api `src/v1/<m>/README.md` (`## Purpose`, `## Owned tables`, `## Facade surface`, `## Endpoints`, `## Events published`, `## Events subscribed`, `## Jobs`, `## Resilience`, `## Layers`, `## How to run its tests`); erp-web `src/features/<f>/README.md` (`## Purpose`, `## Legacy screen`, `## Legacy parity`, `## Dropped on purpose`, `## Routes`, `## Data`, `## Messages`, `## How to run its tests`).
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` (`README_HEADINGS`, `02-coding-rules/05-backend.md` BE-05), `src/__tests__/feature-shape.test.ts` (`README_HEADINGS`, `02-coding-rules/06-frontend.md` FE-18).
- **Instead:** Start from the README of a copy of `05-templates/backend-module/` or `05-templates/frontend-feature/` and fill every section.

### DOC-04 Write a comment for a why the code cannot say, and the mandated ones in their exact form

- **Rule:** Write a comment only for a why the code cannot say, and write each mandated comment in its exact form.
- **Where:** erp-api, erp-web and @erp/contracts.
- **Enforced by:** `@eslint-community/eslint-comments/require-description` (every `eslint-disable` carries `-- <reason>`), `erp/require-complexity-note` (`@complexity`, TS-17), `src/__tests__/feature-shape.test.ts` (`// effect: <kind>: <reason>` within the two lines above every `useEffect`, `<kind>` one of `subscribe`, `dom` or `analytics`), `jsdoc/require-jsdoc` (DOC-01).
- **Instead:** `// eslint-disable-next-line no-await-in-loop -- <reason>`; `// effect: dom: restore the list's scroll once its rows are on screen`; `/** ... @complexity O(n) over the rows */`; a comment that restates the code is deleted, and a decision is cited rather than argued in a comment.

## Not adopted

| Item | Why not now | Trigger |
|---|---|---|
| TypeDoc for `@erp/contracts` | the package has two consumers, erp-api and erp-web, and its TSDoc (DOC-01) is read in the editor; a generated site would have no reader | the first consumer of `@erp/contracts` outside the two repositories |
