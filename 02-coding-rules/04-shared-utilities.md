# Utilities, helpers, libraries

- **Applies to:** erp-api, erp-web, @erp/contracts
- **Status:** complete
- **Enforced by:** see each rule

Where a helper lives and what it is called, what a door helper may touch, the standard library before any utility library, and the one way to format money and dates, compute money and mint ids. Written from the configs and the two repositories as built (2026-09-28).

## Rule format

Every rule in this file follows the same shape:

- **Rule:** one imperative sentence.
- **Where:** the folder or file it applies to.
- **Enforced by:** lint rule, CI check, or review checklist item.
- **Instead:** the pattern to use.

## Rules

### UTIL-01 Place a helper on the lowest rung that works and name its file after what it does

- **Rule:** Put a helper on the lowest rung that works (the standard library, an existing door, a file named for its job inside the module or feature that uses it, then a shared door once a second consumer needs it) and name its file after what it does.
- **Where:** production sources of erp-api, erp-web and @erp/contracts.
- **Enforced by:** `erp/no-generic-filename` (a file named `utils`, `helpers`, `common` or `misc` with a `.ts`, `.tsx` or `.mts` extension; erp-web's shadcn `src/lib/utils.ts` is the one allowed, through `allowGenericFilenames`), `no-restricted-imports` (a feature or module reaching into another's internals), `corepack yarn lint`.
- **Instead:** `format-money.ts`, `parse-list-query.ts`, `retry.ts`; promote a helper to erp-api `src/shared/` or erp-web `src/lib/` in the PR that adds its second consumer, never ahead of it.

### UTIL-02 Keep door helpers pure: no I/O, no environment, no clock

- **Rule:** Keep a door helper pure: it reads no environment, does no I/O and reads no clock or random source itself, and takes what it needs as parameters.
- **Where:** erp-api `src/shared/**` and erp-web `src/lib/**` helpers (the env doors, the transports and the timer doors are the named exceptions).
- **Enforced by:** `no-restricted-syntax` (`S_PROCESS_ENV`: `process.env` only in the env door; `S_FETCH`: `fetch` only in a transport or the one server fetch), `no-restricted-imports`, `no-restricted-globals` (timers only in the doors, TS-13), `corepack yarn test:coverage` (a pure helper is covered to its layer's gate without fakes).
- **Instead:** Pass the value in: erp-web's `onErrorRetry` in `src/lib/api/swr-config.ts` takes `setTimeout` and `random` as optional dependencies so its test controls both.

### UTIL-03 Use the standard library first and add a vetted library only by its trigger

- **Rule:** Use the standard library first, and add a vetted library only when its trigger arrives.
- **Where:** erp-api, erp-web and @erp/contracts.
- **Enforced by:** `no-restricted-imports` (`P_BANNED_LIBS`: `lodash`, `moment`; `G_BANNED_LIBS`: `lodash/*`, `lodash-es`, `lodash-es/*`, `moment-timezone`, `moment-timezone/*`; inside every scope of `configs/eslint/backend.mjs` and `configs/eslint/frontend.mjs`), `corepack yarn check:arch` (the UTIL-03 probe imports `lodash` and must fire).
- **Instead:** `Object.groupBy`, `Map.groupBy`, `structuredClone`, array methods and `Intl` through the format doors; the triggers: `date-fns` with `@date-fns/tz` arrives with the first date arithmetic, `dinero.js` with the first client-side money arithmetic, and each passes the dependency checks (a permissive licence, `corepack yarn check:audit` clean, a README line saying why).

### UTIL-04 Format money and dates through the format door, compute api money with `Prisma.Decimal`, mint ids with `crypto.randomUUID()`

- **Rule:** Format money, numbers and dates only through the format doors, compute api money with `Prisma.Decimal`, and mint ids with `crypto.randomUUID()`.
- **Where:** erp-web `src/lib/i18n/format.ts` and `format.server.ts` (the only `Intl` doors, `02-coding-rules/06-frontend.md` FE-26); erp-api money arithmetic, which no module does yet; ids in both repositories.
- **Enforced by:** `src/lib/i18n/__tests__/format.test.ts` (Perfex's formats), `no-restricted-syntax` (`S_INTL`: `Intl` and `toLocale*String` outside the two doors, erp-web), `no-restricted-imports` (`moment`, UTIL-03); `Decimal` money in erp-api is built by the first module that needs it.
- **Instead:** `useFormat()` (client) or `getFormat()` (server), whose `money`, `date`, `dateTime` and `number` take the value only; `new Prisma.Decimal(a).plus(b)`, never `number` arithmetic on stored money; `randomUUID()` from `node:crypto` (erp-api, as `src/shared/logger/request-context.ts` does) or `crypto.randomUUID()` (browser), never `Math.random()` for an id.
- **Why:** MySQL through Prisma, whose `Decimal` maps `DECIMAL` columns exactly; `02-coding-rules/06-frontend.md` FE-26 and `03-architecture/04-frontend-components.md` (the format doors).
