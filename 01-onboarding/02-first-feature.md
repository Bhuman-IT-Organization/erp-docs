# Your first feature: read the login end to end

Audience: a fresher on day 3, with the workstation set up and the local stack running. This page follows one request — a staff member signing in — through every file it touches, in the order it travels. The auth module (`erp-api/src/v1/auth/`) is the reference implementation of every backend layer, and your own module copies its shape. Every path below is repo-relative (erp-api `src/…`, erp-web `src/…` and `app/…`, erp-infra `legacy/…`).

## 1. What you will trace

- The browser posts `{ email, password }` from the Next.js `/login` page to `/api/v1/auth/login`, relative to the page's own origin, so it goes through Nginx like every other request.
- Nginx rate-limits that one path per IP and forwards it to the api container; nothing else in the chain knows the login is special.
- The api checks the lockout counter in Redis, finds the staff row in MySQL, compares the bcrypt hash, re-hashes it at cost 12, snapshots the permissions into Redis, stores a session and answers with an RS256 access token, a CSRF token and three cookies.
- The browser keeps the access token in memory only, then posts it once to the legacy `erp_sso` module (`POST /erp_sso/handoff`), which verifies it against the api's JWKS and opens a normal Perfex session; the page then navigates to `/admin/`.
- Every later api call carries the bearer token; two guards verify it and check permissions from the Redis snapshot; every refresh rotates the cookie and detects replay.
- The api's one outbound call to the legacy system — the `erp_sso` readiness probe — goes through a timeout, a retry policy and a circuit breaker; when the breaker is open the api answers 503 immediately. That seam is THE pattern for any call that leaves the process.

## 2. Run it

```bash
node ../erp-infra/scripts/local-up.mjs           # from erp-api or erp-web: legacy, legacy-db, api, web, nginx, redis on :8088
corepack yarn test src/v1/auth                   # erp-api: unit specs + the in-process controller e2e spec (fakes, no network)
corepack yarn test:int                           # erp-api: against the stack's MySQL/Redis/legacy, incl. a real login on a throwaway password
node ../erp-infra/scripts/verify-wave0.mjs       # the whole thing through Nginx: login, handoff, refresh, replay, lockout, breaker
```

Then open <http://localhost:8088/login>. Baselines at the time of writing: erp-api 440 unit and 56 int tests, erp-web 265 (+ 14 stories compiled by `storybook:build`).

## 3. The request path, file by file

Read them in this order; each entry says what the file does, what it may import, where its test is, and what you would write for your own module.

### `src/v1/auth/auth.routes.ts`

The route constants (`AUTH_ROUTES`), the cookie names (`erp_refresh`, `erp_csrf`, `erp_session_present`), the CSRF header (`x-csrf-token`) and the cookie paths, derived from `API_PREFIX` so they can never drift from the routes. Imports only `src/shared/http/api-prefix.ts`. No test of its own — every other spec asserts these literals. For your module: one constants file, no logic, and erp-web mirrors the paths from it.

### `src/v1/auth/auth.module.ts`

Nest wiring: every layer is a provider, the facade is the export, and the same facade instance is bound to `ACCESS_TOKEN_VERIFIER` so the shared guards resolve it anywhere. `@Global()` because identity is cross-cutting; yours will not be. Imports its own layers and `src/shared/http/auth/access-token-verifier.ts`. Tested by `src/v1/auth/__tests__/auth.facade.spec.ts` (the facade resolves through the module). For your module: the same file with your providers, not global.

### `src/v1/auth/index.ts`

The public surface: the facade, its public types and one deliberate exception, `AUTH_HTTP_SECURITY`, which `src/main.ts` hands to the Fastify plugins because `shared/` may not import `v1/`. Other modules import from here and nowhere deeper (rule BE-03). For your module: export the facade and public types, nothing else.

### `src/v1/auth/controller/auth.controller.ts`

The seven HTTP handlers under `api/v1/auth`. Each one calls the service and returns its DTO; the only HTTP-shaped work is setting or clearing the two session cookies (`erp_refresh` and `erp_session_present`, one helper per direction) and minting the CSRF token with `reply.generateCsrf()`. No logic, no `try/catch` — every failure reaches the shared problem-details filter. Imports the service, the route constants, `TIMINGS`, `AppConfig` and the guard. Tested by `src/v1/auth/__tests__/auth.controller.e2e.spec.ts` (an in-process Fastify app from `src/v1/auth/__tests__/create-auth-test-app.ts`). For your module: decorators, guards, `@Permissions(...)`, one service call per handler.

### `src/v1/auth/controller/jwks.controller.ts`

`GET /.well-known/jwks.json`, outside the `api/v1` prefix, with `Cache-Control: public, max-age=300` from `TIMINGS.auth.jwksCacheMaxAgeS`. Public key members only. For your module: you will rarely need an unprefixed route; if you do, register it in `main.ts`'s exclusion list.

### `src/v1/auth/service/auth.service.ts`

The use-case orchestrator: `login`, `refresh`, `logout`, `logoutAll`, `me`, the two verifier functions the guards call, and `legacySso`. Every step is a call into a rule layer, the repository, the session store or the transport; nothing here touches Prisma, Redis, `fetch` or a breaker. Read `login()` top to bottom. Note the comment above it: **this sequence is never wrapped in a retry**, because a retried password check would count one bad password twice against `auth:lockout:{email}`. Tested by `src/v1/auth/__tests__/auth.service.spec.ts` with the fakes in `src/v1/auth/__tests__/fakes.ts`. For your module: one method per use case, `AppError` for expected failures, no I/O.

### `src/v1/auth/service/auth.validator.ts`

The zod request schema (`parseLoginRequest`: 400 `ERP-VALIDATION-0001` with issues, e-mail lowercased and trimmed) and the business refusals (`refusalReason`, `assertCanLogin`: inactive → the same generic 401 as a wrong password, two-factor → 403 `ERP-AUTH-0007`). Imports the DTO schemas and `AppError`. Tested by `src/v1/auth/__tests__/auth.validator.spec.ts`. For your module: parse every boundary here, return reasons, never throw Nest exceptions.

### `src/v1/auth/service/auth.enricher.ts`

Turns raw `tblstaff_permissions` rows into the `auth:perm:{staffId}` snapshot: `feature.capability` codes verbatim (Perfex's one swapped row stays swapped on purpose), de-duplicated, sorted, plus `isAdmin` and `roleId`. Pure. Tested by `src/v1/auth/__tests__/auth.enricher.spec.ts`. For your module: computed fields and lookups that need no I/O.

### `src/v1/auth/service/auth.transformer.ts`

Entity → response DTO, then parsed through the zod response schema so a `passwordHash`, `refreshToken`, `jti` or `sid` can never ride along. Tested by `src/v1/auth/__tests__/auth.transformer.spec.ts`. For your module: build every DTO field by field and parse it; never spread an entity into a response.

### `src/v1/auth/service/auth.transport.ts`

The only file in the module allowed to call the legacy system or a vendor; it goes through `src/shared/resilience/` — read section 4's resilience subsection next. It also forwards domain events to the publisher port. Its `probeLegacySso()` is `withRetry` around `breaker.execute` around `timeoutSignal` around `fetch`, in that order, and caches a success for `TIMINGS.http.legacy.probeCacheMs`. Imports `RETRY_POLICIES`, `TIMINGS`, `BreakerRegistry`, `withRetry`, `timeoutSignal`, `UpstreamHttpError`, the publisher port, `AppConfig` and the logger. Tested by `src/v1/auth/__tests__/auth.transport.spec.ts` with a fake `fetchImpl`, a fake clock and fake retry sleeps. For your module: one transport file per module; a SAP or Hikvision call lives here and nowhere else.

### `src/v1/auth/service/password-hasher.ts`

`bcryptjs`: `verify` any bcrypt label at any cost, `hash` at cost 12 under PHP's own `$2y` label (so a user who later falls back to the legacy login is still verified by `crypt()`), `needsRehash`. Nothing parses a cost or string-compares a hash. Tested by `src/v1/auth/__tests__/password-hasher.spec.ts`. For your module: a small pure class per cryptographic or formatting concern.

### `src/v1/auth/service/token-issuer.ts`

`jose`: RS256 sign with a `kid` (RFC 7638 thumbprint), verify with `algorithms: ['RS256']` pinned, and the JWKS document with `kty, n, e, alg, use, kid` only. The private key is imported once from `AUTH_JWT_PRIVATE_KEY_PEM` and never exported. Tested by `src/v1/auth/__tests__/token-issuer.spec.ts`. For your module: you will use the guards, not this; it is here so you can see a key handled correctly.

### `src/v1/auth/service/lockout-policy.ts`

Pure functions `nextLockout`, `isLocked`, `retryAfterS` over `TIMINGS.auth.lockout*`: threshold 5, first lock 1 min, doubling, cap 15 min. There is no numeric literal in the file. Tested by `src/v1/auth/__tests__/lockout-policy.spec.ts`. For your module: any policy arithmetic is a pure function reading `TIMINGS`.

### `src/v1/auth/repository/auth.repository.ts`

The only Prisma caller in the module: `findStaffByEmail` (active rows only), `findStaffById`, `rehashPassword` (a compare-and-set `updateMany` returning the count), `touchLogin`, `listPermissions` (`$queryRaw`, because `tblstaff_permissions` has no primary key). It writes only the identity columns of `tblstaff`, the table this module owns (rule BE-04); the ownership guard would reject anything else. Tested by `src/v1/auth/__tests__/auth.repository.int.spec.ts` against the stack. For your module: one repository, your owned tables, raw SQL only where Prisma cannot model the table.

### `src/v1/auth/repository/auth-session.store.ts`

The Redis port: the `AuthSessionStore` interface, the `AUTH_SESSION_STORE` token and the `authKeys` builders — the one place the `auth:*` key names are spelled. Tested through both implementations below. For your module: a port when a second implementation is needed for tests; the interface names the operations, not the Redis commands.

### `src/v1/auth/repository/in-memory-auth-session.store.ts`

The port's fake for unit tests: a `Map` keyed by the same `authKeys` strings, with an injectable clock for TTLs. Never bound at runtime. Tested by `src/v1/auth/__tests__/auth-session.store.spec.ts`, which runs the same contract suite against both implementations. For your module: the fake lives beside the real adapter and passes the same spec.

### `src/v1/auth/repository/redis-auth-session.store.ts`

The ioredis adapter on the auth logical database (`AUTH_REDIS_DB`, `1` locally), opened with the fail-fast options from `TIMINGS.redis` (`lazyConnect`, `enableOfflineQueue: false`, connect and command timeouts) and connected in `onModuleInit`, so an unreachable Redis fails the boot instead of the first login. `authDatabaseUrl()` rewrites the URL path because ioredis lets the path override the `db` option. Tested by `src/v1/auth/__tests__/auth-session.store.int.spec.ts`. For your module: you will use `src/shared/cache/redis.service.ts`; a second client is for a second Redis purpose only.

### `src/v1/auth/model/auth.model.ts`

The entity types: `StaffIdentity` (with `passwordHash`, which never leaves the service layer), `Session`, `TokenClaims`, `PermissionSnapshot`, `Lockout`, `IssuedTokens`. Types only. For your module: entities here, DTOs in `dto/`, never the same type for both.

### `src/v1/auth/dto/auth.dto.ts`

The zod request and response schemas and their `z.infer` types, the JWKS shape and the raw permission-row schema. erp-web mirrors `loginResponseSchema` until `@erp/contracts` exists. For your module: every DTO is a schema first and a type second.

### `src/v1/auth/events/published.ts` and `src/v1/auth/events/subscribed.ts`

`auth.login.succeeded`, `auth.login.failed`, `auth.password.rehashed` as past-tense versioned classes with ids and labels only (the re-hash event carries the seven-character bcrypt labels, never hashes); no subscriptions in wave 0. Published through the port in `src/shared/events/domain-event.publisher.ts`, in-process today, through the outbox later. For your module: declare both lists even when empty (rule BE-05); handlers go in `events/handlers/`.

### `src/v1/auth/facade/auth.facade.ts`

The ONLY surface other modules may import: `verifyAccessToken`, `hasPermission`, `describe`. It implements the `AccessTokenVerifier` port of `src/shared/http/auth/access-token-verifier.ts`, which is how `JwtAuthGuard` and `PermissionGuard` reach this module without importing it. Tested by `src/v1/auth/__tests__/auth.facade.spec.ts`. For your module: the facade is thin and typed; if another module needs your tables, it needs a facade method or an event, never a query.

### `src/v1/auth/README.md`

Purpose, owned tables, facade surface, the endpoint table with every status and code, events, jobs, **Resilience** (breaker name, retry policy, pool budget), the layer table, the Redis keys and how to run the tests. Copy its headings for your module; the Resilience section is mandatory.

## 4. The shared pieces it leans on

- `src/shared/config/env.schema.ts` — the only file that reads `process.env` (rule BE-06); env carries deployment-varying values only.
- `src/shared/config/timings.ts` — **every duration and threshold goes here** (`TIMINGS.auth`, `.breaker`, `.db`, `.redis`, `.http`, `.fastify`). Writing `5000` in a module is a review failure.
- `src/shared/config/retry-policies.ts` — `RETRY_POLICIES.legacyHttp`, `.vendorHttp`, `.redis`, `.queueJob`: attempts, base delay, cap, and `retryOn: isTransientError`.
- `src/shared/config/pool.ts` — `POOL.db.api` (10 per replica) and `.worker`; the floor for `connection_limit` in `DATABASE_URL`.
- `src/shared/config/http.ts` — `HTTP.compress`: the api compresses its own responses once (threshold 256 B); Nginx does not recompress.
- `src/shared/errors/app-error.ts`, `src/shared/errors/error-codes.ts`, `src/shared/errors/problem-details.filter.ts` — `AppError('ERP-…')` becomes an RFC 9457 problem with the code's status and title, plus `Retry-After` when the error carries `retryAfterS`; `src/shared/errors/upstream-unavailable.error.ts` is the 503 an open breaker throws.
- `src/shared/logger/logger.service.ts`, `src/shared/logger/redact.ts` — winston with a redaction list (`password`, `refresh`, `token`, `authorization`); nothing in auth logs a secret.
- `src/shared/http/guards/jwt-auth.guard.ts`, `src/shared/http/guards/permission.guard.ts` — `@UseGuards(JwtAuthGuard, PermissionGuard)` in that order; 401 `ERP-AUTH-0004`, 403 `ERP-AUTH-0005`.
- `src/shared/http/fastify-plugins.ts` — `@fastify/cookie` and `@fastify/csrf-protection`; the `onRequest` hook checks `x-csrf-token` on exactly `POST refresh`, `logout`, `logout-all` and converts the plugin's failure into `AppError('ERP-AUTH-0008')` (Nest's adapter would otherwise lose the code).
- `src/shared/http/compression.ts` — `@fastify/compress` registration from `HTTP.compress`.
- `src/shared/events/domain-event.ts`, `src/shared/events/domain-event.publisher.ts` — the base class and the publisher port the transport forwards to.

### Any call that leaves the process

Resilience in one screen, as implemented in `src/shared/resilience/`:

1. **One deadline per call** — `src/shared/resilience/timeout.ts`: `timeoutSignal(TIMINGS.http.legacy.timeoutMs, parentSignal)`; the breaker runs with `timeout: false` and no HTTP client library adds a second one.
2. **Retry only what is idempotent, only on transient errors** — `src/shared/resilience/retry.ts`: `withRetry(policy, fn)` with exponential backoff and full jitter; `src/shared/resilience/transient-error.ts` is the one predicate (network codes, timeouts, `UpstreamHttpError` ≥ 500 retry; `AppError`, a 4xx and an open breaker never do).
3. **One breaker per external system, in the transport only** — `src/shared/resilience/breaker.ts`: `BreakerRegistry.get('legacy')` (names: `legacy`, `sap`, `hikvision`, `email`, `sms`, `payment`); opossum supplies the state machine, `errorFilter` keeps non-transient errors from counting, an open circuit throws `UpstreamUnavailableError` without calling your function. `src/shared/resilience/resilience.module.ts` builds the registry from `TIMINGS.breaker` and publishes `states()` to `/api/v1/health` as `checks.breakers.<name>` (state word only).
4. **Fail fast and say when to come back** — the filter answers 503 `ERP-UPSTREAM-0001` + `Retry-After: ceil(halfOpenAfterMs / 1000)`; the api's own health `status` stays `ok`.

The pattern, from `src/v1/auth/service/auth.transport.ts` — retry outside the breaker so every attempt is counted and an open circuit short-circuits the remaining attempts:

```ts
async probeLegacySso(): Promise<LegacySsoProbe> {
  const now = this.now();
  if (this.cache !== null && this.cache.until > now) return this.cache.value;
  const value = await withRetry(
    RETRY_POLICIES.legacyHttp,
    () => this.legacy.execute((signal) => this.fetchOnce(signal)),
    this.retryDeps,
  );
  this.cache = { value, until: this.now() + TIMINGS.http.legacy.probeCacheMs };
  return value;
}

private async fetchOnce(signal: AbortSignal | undefined): Promise<LegacySsoProbe> {
  const response = await this.fetchImpl(this.handoffUrl(), {
    method: 'GET',
    redirect: 'manual',
    headers: { accept: 'application/json' },
    signal: timeoutSignal(TIMINGS.http.legacy.timeoutMs, signal),
  });
  return this.toProbe(response);
}
```

`withRetry` around `breaker.execute` around `timeoutSignal` around `fetch` — in that order, and only in a transport file.

**To copy for a SAP or Hikvision call:** take the breaker by name (`breakers.get('sap')`); pick `RETRY_POLICIES.vendorHttp` or add an entry; take the timeout from `TIMINGS.http.vendor`; turn a 5xx into `UpstreamHttpError` so it counts and retries, and every other status into a value or an `AppError` so it does not; fill your README's Resilience section (breaker name, retry policy, pool budget).

**Never:** retry a non-idempotent call (the login is the canonical example — the lockout counter makes a retried verify count twice, so `auth.service.ts` contains no `withRetry`, no breaker and no `fetch`, and the `no-restricted-syntax` and `no-restricted-imports` overrides in erp-api's `eslint.config.mjs` keep it that way — `corepack yarn check:arch` proves they fire; 02-coding-rules/05-backend.md BE-18); call `fetch` from a service or a repository; write a duration literal outside `timings.ts`; add a library with its own retry or timeout layer; catch `UpstreamUnavailableError` to hide an outage.

## 5. The other two sides

### erp-web: `src/features/auth/`

README → messages → schema → endpoints → component → page → route:

- `src/features/auth/README.md` — the 1:1 record (rule FE-18): the legacy view (`application/views/authentication/login_admin.php`), the parity table (legacy class → component:line — written under the old class-for-class reading; FE-18 now asks for flow correspondence, legacy step → our step), the deliberate drops (Remember me, reCAPTCHA pending client confirmation, the LDAP note) and the messages table.
- `src/features/auth/messages/en.json` — every label is a key (rule FE-19); the six legacy keys keep their `_lang.php` names (`admin_auth_login_heading`, `admin_auth_login_button`, …), ours are `snake_case`, error texts are `errors.<code>`; `ar.json` is the placeholder Arabic that proves RTL (rule FE-20) until the customer supplies a translation.
- `src/features/auth/schemas/login.schema.ts` — the zod form schema (`loginSchema`, `LoginInput`), shared by the form resolver and the endpoint; its messages are keys (`LOGIN_MESSAGE_KEYS`).
- `src/features/auth/api/auth.endpoints.ts` — `login`, `fetchCsrf`, `refresh`, `logout`: one `callApi` call each, relative paths (`AUTH_PATHS`), the `x-csrf-token` header, `messageKeyFor(code, retryAfterS)` → `{ key, values }` and `RETRYABLE_LOGIN_CODES` (the form offers "Try again"; nothing retries a login automatically).
- `src/features/auth/api/legacy-handoff.ts` — the one raw `fetch` in the browser: `POST /erp_sso/handoff` with the bearer, `AbortSignal.timeout(CLIENT_TIMINGS.legacyTimeoutMs)`, true iff 204; off the axios instance because legacy being down is not "the API is unreachable".
- `src/features/auth/components/LoginForm.tsx` — `react-hook-form` + zod + shadcn `Field`, every request from an event handler (rule FE-04), one clubbed `useState` (rule FE-11), labels through `useTranslations('auth')`, logical classes only (`me-2`, never `mr-2`), token to memory via `src/lib/auth/session.ts`, the locale cookie written from `user.locale`, then the handoff and a full navigation to `next` (sanitised by `src/lib/auth/safe-next.ts`). Two legacy colours and one legacy glyph carry justified `eslint-disable` lines naming the view (rules FE-14, FE-17).
- `src/features/branding/index.ts` — the public surface of the branding feature (rule FE-07): `BrandLogo`, `fetchBranding`, `themeCss`, … — auth imports `@/features/branding`, never its internals; `app/login/page.tsx` calls `getBranding()` from `src/features/branding/api/branding.server.ts` (a server helper a route may import).
- `src/features/auth/pages/LoginPage.tsx` — the Server Component composition with its own `NextIntlClientProvider` slice (`common` + `auth`); `app/login/page.tsx` — the route, which reads `?next=` per request and renders the page (rule FE-01: routes only in `app/`).
- `src/features/auth/components/LogoutButton.tsx`, `src/features/auth/pages/LogoutPage.tsx`, `app/logout/page.tsx`: csrf → refresh → logout, then `/admin/authentication/logout?legacy=1` to end `sp_session`.

The browser's resilience policy is `src/lib/api/call-api.ts` (the only place the api is called; never throws; **never retries**), `src/lib/api/http.ts` (the one axios instance: `timeout` from `src/lib/api/client-timings.ts`, bearer interceptor, problem-details → `ApiError`, and `src/lib/api/api-status.ts` marking 503/timeout/network as "API unreachable" for one banner), and `src/lib/api/swr-config.ts` (reads retry a 5xx/timeout/network at most 3 times with full jitter, never a 4xx; mutations never go through it) — rule FE-08; the read/write hooks a real screen uses (`src/lib/api/use-common-api.ts`, `src/lib/api/use-common-mutation.ts`, `src/lib/api/create-resource-hooks.ts`) sit beside them, and a copy of `05-templates/frontend-feature/` (rule FE-22) is a feature that calls them: it lands under `app/(shell)/<name>/` and `src/features/<name>/` on the base UI kit (a `ListPageTemplate` list, a `SchemaForm` form with the save summary, both behind `withAuth(withPermission(…))`), with its three routes declared in `src/config/route-gates.ts` as `ADMIN_GATE` — fail closed, administrators only — until the module's own view code replaces it; a copy of `05-templates/backend-module/` is its api half, serving exactly the routes the feature calls. The login is the older, hand-built shape; the four staff and roles screens (`src/features/staff/`) are the kit's worked example. Every test lives in a `__tests__/` folder beside its code (rule FE-05): `src/features/auth/components/__tests__/LoginForm.test.tsx` is the happy-dom form test and the Arabic smoke test.

### erp-infra: `legacy/modules/erp_sso/`

Why a module: Perfex `require`s the init file of every activated module on every request, so `legacy/modules/erp_sso/erp_sso.php` hooks `app_init` without editing a core file; locally it is a read-only bind mount plus a `tblmodules` row, on cPanel an upload plus Setup → Modules → Activate. The listener verifies the bearer with the vendored php-jwt 5.x (RS256 only, `kid` from the api's JWKS, `iss`/`aud` checked by the module), maps `sub` to an active `tblstaff` row and sets the two session keys Perfex's own login sets, `staff_user_id` and `staff_logged_in`, so the database session driver emits `sp_session`. `legacy/modules/erp_sso/controllers/Erp_sso.php` is `POST /erp_sso/handoff` (204 / 401 / 405), CSRF-excluded through `legacy/modules/erp_sso/config/csrf_exclude_uris.php`. `legacy/modules/erp_sso/libraries/Erp_sso_jwks.php` fetches and caches the JWKS (1 h, stale on failure, one forced refetch on an unknown `kid`) and converts JWK `n`/`e` to a PEM byte-identical to Node's `exportSPKI`. Settings are in `legacy/modules/erp_sso/config/erp_sso.php`; `legacy/modules/erp_sso/README.md` has the delivery steps.

## 6. Rules you just saw in action

- BE-01 the layer folders of `src/v1/auth/`; BE-03 `index.ts` and the facade; BE-04 the repository writes `tblstaff` only; BE-05 the README's tables and events; BE-06 `env.schema.ts`; BE-08 each layer's one duty (the service returns the DTO, the controller never catches); BE-09 `AppError` and the problem-details filter; BE-10 one logger with `redact()` and the request context; BE-18 `withRetry` → breaker → `timeoutSignal` → `fetch` only in the transport; BE-19 the API conventions (bare single resource, `x-request-id`, problem details); BE-22 new modules come from a copy of the template — `02-coding-rules/05-backend.md`.
- FE-01 `app/login/page.tsx` is a route only; FE-03 no API origin in the browser; FE-04 requests from event handlers; FE-05 Vitest in `__tests__/` beside the code; FE-07 `@/features/branding` through its index; FE-08 `callApi` never retries, reads through SWR; FE-17 brand from `getBranding()`, no customer name or colour in code (`corepack yarn check:brand`); FE-18 the README's legacy view, parity table and drops; FE-19 every label a message key keyed by the legacy `_lang.php` name; FE-20 logical classes, `dir` once in `app/layout.tsx`; FE-22 new features from a copy of the template — `02-coding-rules/06-frontend.md`.

## 7. What is deliberately not here yet

- The transactional outbox: events are delivered in-process; `src/shared/events/domain-event.publisher.ts` is the port the outbox rebinds when the first module needs delivery beyond the process — a cross-module subscriber or a job (02-coding-rules/05-backend.md BE-13).
- `@erp/contracts/permissions.ts`: codes are Perfex's `feature.capability` strings until the catalogue is authored.
- The shared L1/L2 cache layer: the 5 s version cache in `auth.service.ts` is a private `Map` for now.
- The attendance API (`/api/auth/*`, `/api/attendance/*`, `/api/face/*`) stays on Perfex's HS256 issuer until it is migrated.
- Stale-on-open cached reads and the other five breakers arrive with the phases that add SAP, Hikvision and vendor calls; `legacy` is the only breaker with a caller today.
- Password change, "notify on refresh reuse", device limits and admin force-logout are later increments of this module.
