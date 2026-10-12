# Backend (erp-api)

- **Applies to:** erp-api
- **Status:** complete (written from v1/auth and v1/branding as built, 2026-09-19; BE-23 API documentation and BE-24 hygiene added 2026-09-20)
- **Enforced by:** see each rule; the architecture ESLint block in erp-api `configs/eslint/backend.mjs` and the `HYGIENE` / `TEST_HYGIENE` objects after it, `configs/eslint/base.mjs` for the unused-directive option, `src/v1/__tests__/module-shape.spec.ts`, `src/v1/__tests__/openapi-covers-routes.spec.ts`, `src/__tests__/test-placement.spec.ts`, corepack yarn check:arch

Folder structure, layers, validation, errors, logging, config and timings, cache, events, jobs and queues, idempotency, integrations, sessions, resilience, API conventions, wiring, tests per layer, the module template, API documentation, hygiene. Every rule names what enforces it today; where the machinery is not built, the rule states the contract, the trigger that builds it, the spec that arrives with it, and what enforces its absence until then. Explanations live in `03-architecture/03-backend-components.md`.

## Rule format

Every rule in this file follows the same shape:

- **Rule:** one imperative sentence.
- **Where:** the folder or file it applies to.
- **Enforced by:** lint rule, CI check, or review checklist item.
- **Instead:** the pattern to use.

`Enforced by` names at least one of: an ESLint rule id from the architecture block (cited as `<constant> in scope N`, see "Layers"), a spec path, a `corepack yarn` script, `tsc`, or the trigger phrase "built by the first module that needs …" plus the spec that arrives with it and the check that enforces the absence today. "Review" appears only in addition.

## The tree

Every file under erp-api `src/` as built (`[now]`, one line per file) plus the reserved names nobody creates ad hoc (`[reserved — built by the first module that needs it]`). Paths are relative to `src/`; `shared/db/generated/` is gitignored `prisma generate` output.

```text
main.ts                                  [now] composition root (see the sentence below the tree)
app.module.ts                            [now] root module: SHARED_IMPORTS (config, logger, events, health, resilience, db, cache, idempotency, storage, uploads), QueueModule.forRoot({ runWorkers: false }) (it enqueues), V1Module, IntegrationsModule
worker.ts                                [now] the worker entry beside main.ts (BE-14): WorkerModule as an application context, no HTTP listener; one BullMQ worker per registered processor
worker.module.ts                         [now] SHARED_IMPORTS, QueueModule.forRoot({ runWorkers: true }), V1Module, IntegrationsModule: every module's processors register as in the api
__tests__/app.e2e.int.spec.ts            [now] whole AppModule against the local stack
__tests__/test-placement.spec.ts         [now] every *.spec.ts has __tests__ as its parent folder
__tests__/worker.int.spec.ts             [now] WorkerModule as worker.ts boots it: registers uploads.cleanup, upserts its scheduler on db 2, closes within TIMINGS.queue.closeTimeoutMs
__tests__/no-vendor-licence.spec.ts      [now] no vendor licence call, key, header or breaker anywhere in src, packages, scripts or prisma; erp-web holds the twin
ambient.d.ts                             [now] ambient aliases (skipLibCheck is false)
reset.d.ts                               [now] @total-typescript/ts-reset
shared/README.md                         [now] folder table (present/reserved; queue, storage and uploads present) and the rules shared/ owns
shared/cache/cache.module.ts             [now] global; provides RedisService
shared/cache/redis.service.ts            [now] ioredis on REDIS_URL (db 0), TIMINGS.redis options, the `redis` probe
shared/cache/__tests__/redis.service.spec.ts [now]
shared/cache/local-cache.service.ts      [reserved — built by the first module that needs it] L1 tier + @Cacheable + key builder
shared/config/env.schema.ts              [now] the only process.env reader: zod + refinements, fail fast; FILE_STORAGE_DIR required outside test, UPLOAD_MAX_BYTES and UPLOAD_MAX_FILES, QUEUE_REDIS_DB (2, never the auth or cache db), DB_POOL_ROLE, MODULES_DISABLED and MODULE_NAMES (empty today)
shared/config/__tests__/env.schema.spec.ts [now]
shared/config/app-config.ts              [now] AppConfig: injectable typed env
shared/config/config.module.ts           [now] global; provides AppConfig and ModuleSwitch
shared/config/timings.ts                 [now] TIMINGS: auth, branding, breaker, db, redis, http, health, fastify, uploads (tus expiry, hourly cleanup), idempotency (in-progress 2 min, replay 24 h), queue (kept jobs, close timeout), mail (the SMTP stage timeouts, sweep, purge, test window)
shared/config/__tests__/timings.spec.ts  [now] every TIMINGS group frozen and its values pinned; RETRY_POLICIES.mailSend and POOL.smtp
shared/config/legacy-locale.ts           [now] LEGACY_LANGUAGE_TO_LOCALE (legacy pack name → BCP-47), DEFAULT_LOCALE, toLocale
shared/config/__tests__/legacy-locale.spec.ts [now]
shared/config/retry-policies.ts          [now] RETRY_POLICIES: legacyHttp, vendorHttp, redis, queueJob, mailSend (8 attempts, 30 s base, 30 min cap)
shared/config/pool.ts                    [now] POOL.db.api = 10, .worker = 5; POOL.smtp.maxConnections = 2 per worker replica
shared/config/http.ts                    [now] HTTP.compress
shared/config/modules.ts                 [now] ModuleSwitch (disabled, isEnabled, assertEnabled) and MODULE_DISABLED_CODES (empty today); re-exports MODULE_NAMES, ModuleName, parseModulesDisabled from env.schema.ts
shared/config/__tests__/modules.spec.ts  [now]
shared/config/flags.ts                   [reserved: built by the first module that needs it] feature flags (01-typescript-and-lint.md TS-14)
shared/crypto/password-hasher.port.ts    [now] PASSWORD_HASHER — v1/identity writes the hash, v1/auth owns the algorithm (moved from http/auth/: hashing reads no request)
shared/db/db.module.ts                   [now] global; provides PrismaService
shared/db/prisma.service.ts              [now] guarded Prisma client over both ownership registers and the co-write register (the boot line counts tables, node-owned tables and co-write records), explicit pool URL: POOL.db[DB_POOL_ROLE] (api or worker) when the URL has no connection_limit
shared/db/__tests__/prisma.service.spec.ts [now] the pool a process takes by DB_POOL_ROLE; a URL's own connection_limit wins
shared/db/transaction.ts                 [now] DbTransaction: the cross-module transaction token (BE-08); services and facades pass it through as a type, only repository/ calls methods on it
shared/db/database-url.ts                [now] withPoolParams, authDatabaseUrl
shared/db/__tests__/database-url.spec.ts [now]
shared/db/ownership.ts                   [now] loadOwnership: prisma/ownership.json unioned with prisma/ownership-node.json (DB-02)
shared/db/__tests__/ownership.spec.ts    [now] the union, the both-registers refusal, the committed node register
shared/db/ownership-guard.ts             [now] rejects writes to non-node tables, model and raw (DB-03), except a recorded co-write (top-level model, listed columns; raw only for a raw record and its verb; rawVerbOf)
shared/db/__tests__/ownership-guard.spec.ts [now] the node-owned tripwire names exactly the thirteen node-owned tables
shared/db/__tests__/ownership-guard.int.spec.ts [now] its perfex-owned fixture table is tblknowledge_base_groups (groupid, name); a first case fails if the register stops giving it to perfex-core
shared/db/ownership-cowrites.ts          [now] loadCoWrites, coWriteFor: prisma/ownership-cowrites.json, the third register; refuses a node-owned or unregistered table, a duplicate (table, operation), '*' with update
shared/db/__tests__/ownership-cowrites.spec.ts [now] the loader's refusals, coWriteFor, and the structural scan: only a record's files write its table
shared/errors/app-error.ts               [now] AppError(code, detail?, extras?)
shared/errors/error-codes.ts             [now] ERROR_CODES + ErrorCode union (ERP-CORE-0010..0012 the idempotency refusals, BE-15; ERP-CORE-0013 412 stale save and 0014 428 missing If-Match; ERP-CORE-0004 the generated module's not-found); ERP-EXPENSECATEGORIES-0001 the expense category in-use refusal; ERP-TAXES-0001 to 0004 the tax refusals: in use, Perfex's locked edit, a duplicate name, a default tax; ERP-COSTCENTERS-0001 the cost center in-use refusal; ERP-PAYMENTMODES-0001 and 0002 the payment mode delete refusals: in use, the credit expense mode; ERP-CURRENCIES-0001 to 0005 the currency refusals: in use, the base, a registered use, the base locked, the code locked; ERP-IDENTITY-0009 an unknown department on a member save; ERP-MAIL-0002 and 0004 to 0008 the mail refusals (0001 and 0003 are web copy keys, never thrown); ERP-FILES-0001 and 0002
shared/errors/problem-details.filter.ts  [now] AppError → problem+json; unknown → ERP-INTERNAL-0001; Nest's unknown-route 404 → ERP-CORE-0004 without the path or method; `issues` only for ISSUE_CODES (VALIDATION-0001, CORE-0013)
shared/errors/__tests__/problem-details.filter.spec.ts [now]
shared/errors/__tests__/unknown-route.spec.ts [now] an unknown route answers the ERP-CORE-0004 body and never echoes the path
shared/errors/upstream-unavailable.error.ts [now] the open-breaker 503 + Retry-After
shared/errors/retry-later.error.ts       [now] RetryLaterError: an upstream said "try again later"; transient for isTransientError, never an AppError
shared/errors/prisma-error.mapper.ts     [reserved — built by the first module that needs it] unique/not-found mapping
shared/events/domain-event.ts            [now] DomainEvent base: name, version, occurredAt, payload
shared/events/domain-event.publisher.ts  [now] DOMAIN_EVENT_PUBLISHER + DOMAIN_EVENT_SUBSCRIBER ports; RecordingDomainEventPublisher fans out in-process; it records the events only when built with record = true, as every spec builds it (the application's instance records nothing)
shared/events/__tests__/domain-event.publisher.spec.ts [now]
shared/events/events.module.ts           [now] global; binds the port
shared/health/health.types.ts            [now] HealthCheck, HealthReport
shared/health/health.service.ts          [now] probe registry, TIMINGS.health budgets, breaker states
shared/health/__tests__/health.service.spec.ts [now]
shared/health/health.controller.ts       [now] GET on HEALTH_ROUTES: 200 or 503, same body
shared/health/__tests__/health.controller.spec.ts [now]
shared/health/health.module.ts           [now]
shared/http/api-prefix.ts                [now] API_PREFIX, HEALTH_ROUTES, WELL_KNOWN_JWKS_PATH, UNPREFIXED_ROUTES
shared/http/request-id.ts                [now] registerRequestId(app): x-request-id hook, opens the request context
shared/http/openapi.ts                   [now] @ApiZod (produces: 'export' for a list export: one 200 as text/csv, xlsx, application/pdf and application/json print rows), zodToSchema, buildOpenApiDocument, setupApiDocs (BE-23)
shared/http/__tests__/openapi.spec.ts    [now]
shared/http/status.ts                    [now] HTTP_STATUS named codes (ACCEPTED 202 for a queued send), isSuccessStatus
shared/http/__tests__/request-id.spec.ts [now]
shared/http/fastify-plugins.ts           [now] cookie + CSRF plugins; the CSRF hook → AppError('ERP-AUTH-0008'); onSend: a refresh answered 0002/0003 clears both session cookies
shared/http/compression.ts               [now] @fastify/compress from HTTP.compress
shared/http/auth/access-token-verifier.ts [now] ACCESS_TOKEN_VERIFIER port, AuthenticatedUser
shared/http/guards/jwt-auth.guard.ts     [now] bearer → verifier → request.user, bindStaffId; 401 ERP-AUTH-0004
shared/http/guards/__tests__/jwt-auth.guard.spec.ts [now]
shared/http/guards/permission.guard.ts   [now] @Permissions ALL / @PermissionsAny ANY → hasPermission; 403 ERP-AUTH-0005; resolves the row scope
shared/http/guards/__tests__/permission.guard.spec.ts [now]
shared/http/guards/module-enabled.guard.ts [now] class-level: a switched-off module's routes answer its 403 (its MODULE_DISABLED_CODES entry) before the 401; a class without @ModuleKey fails closed; ModuleOffNotFound, opt-in: the generic 404 with no-store, noindex
shared/http/guards/__tests__/module-enabled.guard.spec.ts [now]
shared/http/decorators/permissions.decorator.ts [now] @Permissions(PERMISSIONS.staff.members.view), @PermissionsAny(view, viewOwn) — clean names from @erp/contracts, never a Perfex code
shared/http/decorators/current-user.decorator.ts [now] @CurrentUser()
shared/http/decorators/scope.decorator.ts [now] @Scope(), scopeFrom, READ_SCOPES: the all | own row scope
shared/http/__tests__/scope.decorator.spec.ts [now]
shared/http/decorators/if-match.decorator.ts [now] @IfMatch(): the fingerprint an opted-in PATCH or PUT must send; missing, empty or `*` is 428 ERP-CORE-0014
shared/http/decorators/module-key.decorator.ts [now] @ModuleKey(name) on a controller CLASS beside @UseGuards(ModuleEnabledGuard), never a handler; ModuleOffNotFound, opt-in
shared/http/pagination.ts                [now] parseListQuery, LIST_QUERY_LIMITS, FILTER_OPERATORS: the BE-19 limit/cursor/filter/sort parser; CURSOR_MAX_LENGTH 4096, so a page boundary on a 191-character Arabic name pages on (the cursor decision (a); a cursor above 4096 characters is a known limit, a 400)
shared/http/__tests__/pagination.spec.ts  [now] a case per operator and per rejection
shared/http/keyset.ts                    [now] encodeCursor, decodeCursor, keysetWhere, compareKeys, listPageMetaSchema — the BE-19 keyset seam
shared/http/__tests__/keyset.spec.ts     [now]
shared/http/csv.ts                       [now] CSV_BOM, CSV_CONTENT_TYPE, EXPORT_MAX_ROWS, EXPORT_HEADER_MAX_LENGTH, escapeFormula (the one formula escape, CSV and Excel), csvCell, toCsvLine, parseExportHeaders, EXPORT_FILE_EXTENSIONS, exportFilename(stem, now, extension): the one CSV rule
shared/http/__tests__/csv.spec.ts        [now] a case per quoting, formula-escape, header, extension and file-name rule
shared/http/export.ts                    [now] the one list export: EXPORT_FORMATS, EXPORT_ROW_LIMITS, PRINT_MAX_ROWS, parseExportOptions (format, column, header, key, the presentation), runExport (count, cap, one keyset loop, a writer per format), replyExport, exportPrintRowsSchema, the documentation-only DTO fields (BE-19)
shared/http/__tests__/export.spec.ts     [now] every refusal on its own path, both caps before any read, the loop, each writer, the headers replyExport sets
shared/http/export-display.ts            [now] parseExportDisplay, displayCell, formatExportDate, formatExportDateTime: the PDF and Print display values from the sent words and formats
shared/http/__tests__/export-display.spec.ts [now] the seven date formats, 12 and 24 hour time, the zone, on erp-web's own vectors
shared/http/xlsx.ts                      [now] toXlsx(header, rows, sheet?, headerFills?): one sheet over write-excel-file, a bold frozen header (opt-in fills by column), typed cells, never a formula
shared/http/__tests__/xlsx.spec.ts       [now] the unzipped workbook: cell types, the escaped text, the sheet name cut to 31
shared/http/pdf.ts                       [now] toPdf over pdfkit (A4 landscape, title, date line, the header repeated on every page), isPdfDrawable, assertPdfDrawable: the ['font'] refusal
shared/http/__tests__/pdf.spec.ts        [now] the uncompressed document read page by page: geometry, the repeated header, the cut cell, the refusal
shared/http/etag.ts                      [now] the row fingerprint: a quoted strong ETag over what the screen shows, sent as `etag` in the body and the ETag header; the repository compares after the row lock (412 ERP-CORE-0013)
shared/http/__tests__/etag.spec.ts       [now]
shared/http/interceptors/                [now] IdempotencyInterceptor and @Idempotent() (BE-15); @Audited (BE-19) is still built by the first module that needs it; NoStoreInterceptor
shared/http/interceptors/idempotency.interceptor.ts [now] BE-15 Layer 1: a handler marked @Idempotent() runs at most once per (staff, Idempotency-Key); the key is any 16 to 128 character token of [A-Za-z0-9_-]; a replay carries Idempotent-Replayed: true
shared/http/interceptors/idempotency.module.ts [now] global: the Redis store on the cache client (db 0) under IDEMPOTENCY_STORE, and the interceptor
shared/http/interceptors/idempotency.store.ts [now] one record per (staff, key): in-progress with the fingerprint, then done with the status and body; TIMINGS.idempotency TTLs
shared/http/interceptors/idempotent.decorator.ts [now] @Idempotent() after @UseGuards(JwtAuthGuard, ...); re-exports IDEMPOTENT_KEY
shared/http/interceptors/no-store.interceptor.ts [now] no-store and noindex set before the handler, errors included; setNoStore
shared/http/interceptors/__tests__/idempotency.interceptor.spec.ts [now]
shared/http/interceptors/__tests__/idempotency.store.int.spec.ts [now] the store on the local Redis, db 0
shared/http/interceptors/__tests__/no-store.interceptor.spec.ts [now]
shared/logger/logger.service.ts          [now] winston, Console only, json (pretty in development)
shared/logger/__tests__/logger.service.spec.ts [now]
shared/logger/logger.module.ts           [now]
shared/logger/redact.ts                  [now] REDACT_KEYS (smtp_?password and pass) + bearer masking: THE redaction list and x-shipment-hash
shared/logger/__tests__/redact.spec.ts   [now]
shared/logger/request-context.ts         [now] AsyncLocalStorage { requestId, staffId? } and its helpers
shared/logger/__tests__/request-context.spec.ts [now]
shared/resilience/breaker.ts             [now] BreakerRegistry (opossum), BREAKER_NAMES
shared/resilience/__tests__/breaker.spec.ts [now]
shared/resilience/retry.ts               [now] withRetry(policy, fn, deps?)
shared/resilience/__tests__/retry.spec.ts [now]
shared/resilience/timeout.ts             [now] timeoutSignal(ms, parent?)
shared/resilience/__tests__/timeout.spec.ts [now]
shared/resilience/transient-error.ts     [now] UpstreamHttpError, isTransientError (a RetryLaterError is transient)
shared/resilience/__tests__/transient-error.spec.ts [now] what the queue retries: 5xx, timeouts, network codes, RetryLaterError; never an AppError
shared/resilience/resilience.module.ts   [now] global; provides BreakerRegistry
shared/validation/                       [reserved — built by the first module that needs it] validators call safeParse today
shared/queue/                            [now] BullMQ on Redis db 2 under the `bull` prefix, one `<queue>.dlq` per queue (BE-14)
shared/queue/queue.module.ts             [now] global; forRoot({ runWorkers }): the api enqueues (false), WorkerModule also runs the workers (true)
shared/queue/queue.service.ts            [now] QueueService: add, the repeatable schedulers, the DLQ and replayDeadLetters; retries from RETRY_POLICIES.queueJob or a processor's retryPolicy; DeferJobError spends no attempt
shared/queue/base.processor.ts           [now] BaseProcessor(queues: ProcessorRegistry) and NonRetryableJobError: a module's job is v1/<m>/jobs/<name>.job.ts plus <name>.processor.ts
shared/queue/queue-connection.ts         [now] the producer and worker connections on QUEUE_REDIS_DB (db 2), never the cache's or auth's
shared/queue/__tests__/queue.service.spec.ts [now]
shared/queue/__tests__/queue.int.spec.ts [now] db 2 on the wire: retries then the DLQ, defer without an attempt, an open breaker defers; no bull:test.q-* key left
shared/storage/storage.port.ts           [now] STORAGE, StoragePort: Node's own file storage, a volume now, object storage later, never Perfex's upload folders
shared/storage/storage.module.ts         [now] global; provides STORAGE as VolumeStorage at FILE_STORAGE_DIR
shared/storage/volume.storage.ts         [now] StoragePort on a directory: every key matches STORAGE_KEY and resolves inside the root (containedPath) before any disk call
shared/storage/__tests__/storage.contract.ts [now] the port contract both implementations pass
shared/storage/__tests__/in-memory.storage.ts [now] InMemoryStorage, the port's fake for unit and e2e specs
shared/storage/__tests__/in-memory.storage.spec.ts [now]
shared/storage/__tests__/volume.storage.spec.ts [now]
shared/uploads/uploads.module.ts         [now] global: the tus endpoint, UploadsService, UploadPurposeRegistry and the hourly uploads.cleanup processor
shared/uploads/uploads.controller.ts     [now] /api/v1/uploads: the tus 1.0.0 protocol endpoint (POST, HEAD, PATCH, DELETE) and the rules read; outside the OpenAPI document
shared/uploads/uploads.service.ts        [now] @tus/server with @tus/file-store staging under FILE_STORAGE_DIR/.tus; owner check per id, sniff, then a move into STORAGE
shared/uploads/upload-purpose.ts         [now] UploadPurposeRegistry: the module that owns the rows registers its purpose in onModuleInit (anyOf codes, storage area, types, limits, onComplete)
shared/uploads/sniff.ts                  [now] the bytes must be what the name says and the extension one the purpose allows (file-type; csv and txt by a text check)
shared/uploads/tus-content-type.ts       [now] registerTusContentType: Fastify accepts application/offset+octet-stream and reads nothing, so tus streams the chunk
shared/uploads/uploads-cleanup.processor.ts [now] uploads.cleanup, hourly (TIMINGS.uploads.cleanupEveryMs): removes unfinished uploads past their 24 h expiry
shared/uploads/__tests__/tus-client.ts   [now] a minimal tus client for the e2e spec
shared/uploads/__tests__/sniff.spec.ts   [now]
shared/uploads/__tests__/uploads-cleanup.processor.spec.ts [now]
shared/uploads/__tests__/uploads.controller.e2e.spec.ts [now] create, resume, finish and every refusal on the wire (owner, purpose, type, size)
shared/base/                             [reserved — built by the first module that needs it] no layer extends a base today
shared/timers/                           [reserved — built by the first module that needs it]
shared/utils/                            [reserved — built by the first module that needs it]
integrations/README.md                   [now] the ports/adapters/webhooks tree ([now] marks email), four import rules, the email Resilience line, the nodemailer approval
integrations/integrations.module.ts      [now] @Global(): the one place adapters are wired; exports EMAIL_PROVIDER (the SMTP adapter) (BE-16)
integrations/ports/email-provider.port.ts [now] EMAIL_PROVIDER, EmailProviderPort: send(message) answers a classified SendResult, throws only UpstreamUnavailableError; configured; EmailAttachment bytes
integrations/adapters/email/smtp.adapter.ts [now] the only nodemailer user (scope 16): one lazy pool from POOL.smtp, TLS 1.2+, no pool requeue; every send inside the email breaker; classified SendResult; attachments to nodemailer's, never a path
integrations/adapters/email/smtp-classify.ts [now] pure: the SMTP failure table (connection, timeout and 421 count on the breaker; a refusal is a value), cleanServerReply
integrations/adapters/email/fake-email.adapter.ts [now] the port fake: records messages, answers next; for src/integrations specs and local wiring (v1 specs fake the port)
integrations/adapters/email/__tests__/fake-email.adapter.spec.ts [now]
integrations/adapters/email/__tests__/smtp-classify.spec.ts [now] a case per row of the failure table
integrations/adapters/email/__tests__/smtp.adapter.spec.ts [now] the transport options, the breaker counting, the log line without an address
integrations/adapters/email/__tests__/smtp.adapter.int.spec.ts [now] against the local Mailpit (127.0.0.1:11025, MAILPIT_API_URL); fails when Mailpit is down, by design
integrations/adapters/email/__tests__/mailpit.ts [now] the Mailpit REST client of the int specs (clear, find by Message-ID, chaos); reads no process.env
integrations/webhooks/                   [reserved — built by the first module that needs it] signature check, then enqueue
v1/v1.module.ts                          [now] imports ExampleItemModule, AuthModule, BrandingModule, IdentityModule, ExpenseCategoriesModule, MailModule, TaxesModule, CostCentersModule, PaymentModesModule, CurrenciesModule, DepartmentsModule, SettingsModule, CustomFieldsModule
v1/__tests__/module-shape.spec.ts        [now] tree, README, events catalog, spec-per-layer clauses; FACADE_ONLY_MODULES (settings); TABLELESS_MODULES (branding); optionalTop jobs (BE-14); SHARED_ALLOWLIST with queue, storage and uploads
v1/__tests__/openapi-covers-routes.spec.ts [now] every registered route has a documented operation (BE-23); every export's 200 equals EXPORT_SUCCESS (text/csv, xlsx, application/pdf, the print rows) in both blocks; a second block over v1/identity's own app
v1/auth/README.md                        [now] the reference README
v1/auth/auth.module.ts                   [now] @Global() (the one exception); exports AuthFacade + the verifier port
v1/auth/auth.routes.ts                   [now] AUTH_ROUTES, cookie names and paths
v1/auth/index.ts                         [now] facade, public types, AUTH_HTTP_SECURITY
v1/auth/controller/auth.controller.ts    [now] seven handlers; cookies via reply; per-handler guards; no try
v1/auth/controller/jwks.controller.ts    [now] GET /.well-known/jwks.json, Cache-Control from TIMINGS
v1/auth/service/auth.service.ts          [now] orchestrator; injectable now; versionCache memo
v1/auth/service/auth.validator.ts        [now] zod schemas; refusalReason() or AppError
v1/auth/service/auth.enricher.ts         [now] pure: rows → PermissionSnapshot
v1/auth/service/auth.transformer.ts      [now] field by field, then schema.parse
v1/auth/service/auth.transport.ts        [now] withRetry → breaker → timeoutSignal → fetch; publish()
v1/auth/service/lockout-policy.ts        [now] pure policy over TIMINGS.auth.lockout*
v1/auth/service/password-hasher.ts       [now] bcryptjs verify/hash/needsRehash
v1/auth/service/token-issuer.ts          [now] jose RS256, JWKS document
v1/auth/repository/auth.repository.ts    [now] the only Prisma caller; $queryRaw + zod for the PK-less table
v1/auth/repository/auth-session.store.ts [now] the Redis port + authKeys
v1/auth/repository/in-memory-auth-session.store.ts [now] the port's fake
v1/auth/repository/redis-auth-session.store.ts [now] ioredis adapter on AUTH_REDIS_DB (db 1)
v1/auth/model/auth.model.ts              [now]
v1/auth/dto/auth.dto.ts                  [now] zod schemas, EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH; meResponseSchema carries disabledModules
v1/auth/events/published.ts              [now] three past-tense classes; AUTH_PUBLISHED_EVENTS
v1/auth/events/subscribed.ts             [now] IDENTITY_EVENTS + AUTH_SUBSCRIBED_EVENTS: the four identity names (scope 14 admits the grammar)
v1/auth/events/handlers/identity-access.handler.ts [now] the four subscriptions: end sessions (delete auth:sess, bump the version), drop auth:perm
v1/auth/facade/auth.facade.ts            [now] verifyAccessToken, hasPermission, describe
v1/auth/__tests__/fakes.ts               [now]
v1/auth/__tests__/create-auth-test-app.ts [now] the in-process Fastify app
v1/auth/__tests__/auth.controller.e2e.spec.ts [now]
v1/auth/__tests__/auth.service.spec.ts   [now]
v1/auth/__tests__/auth.validator.spec.ts [now]
v1/auth/__tests__/auth.enricher.spec.ts  [now]
v1/auth/__tests__/auth.transformer.spec.ts [now]
v1/auth/__tests__/auth.transport.spec.ts [now]
v1/auth/__tests__/auth.facade.spec.ts    [now]
v1/auth/__tests__/auth-session.store.spec.ts [now] port contract, both implementations
v1/auth/__tests__/auth-session.store.int.spec.ts [now] db=1 on the wire
v1/auth/__tests__/auth.repository.int.spec.ts [now]
v1/auth/__tests__/lockout-policy.spec.ts [now]
v1/auth/__tests__/password-hasher.spec.ts [now]
v1/auth/__tests__/identity-access.handler.spec.ts [now] the wiring, the payload guard, a failing handler contained
v1/auth/__tests__/token-issuer.spec.ts   [now]
v1/branding/README.md                    [now] the smallest complete module; ## Owned tables None, ## Read-only sources the settings and currencies facades, the two subscribed events
v1/branding/branding.module.ts           [now] not global; imports SettingsModule and CurrenciesModule; no repository (BE-01); provides the currencies change handler; exports BrandingFacade
v1/branding/branding.routes.ts           [now]
v1/branding/index.ts                     [now]
v1/branding/controller/branding.controller.ts [now] anonymous GET; Cache-Control from TIMINGS
v1/branding/service/branding.service.ts  [now] memo for TIMINGS.branding.cacheMs; currentResponse(); formats fail closed to DEFAULT_FORMATS; the ten options and the base currency through the transport in one Promise.all; dropMemo() for the currencies change handler
v1/branding/service/branding.transformer.ts [now]
v1/branding/service/branding.transport.ts [now] the ten BRANDING_OPTION_NAMES through SettingsFacade.getOptions (BE-03) and the base through CurrenciesFacade.baseCurrency; in-process, no breaker
v1/branding/model/branding.model.ts      [now] Branding, Formats, DEFAULT_FORMATS, the Perfex date and separator allowlists, BrandingOptionName (each on SETTINGS_ALLOW_LIST)
v1/branding/dto/branding.dto.ts          [now] formatsSchema inside brandingResponseSchema; no currency row schema (the facade's Currency)
v1/branding/events/published.ts          [now] [] as const
v1/branding/events/subscribed.ts         [now] CURRENCIES_EVENTS and BRANDING_SUBSCRIBED_EVENTS: currencies.record.baseChanged and .updated
v1/branding/events/handlers/currencies-change.handler.ts [now] CurrenciesChangeEventHandler: subscribes both names on DOMAIN_EVENT_SUBSCRIBER and drops the memo on baseChanged and updated without reading the payload
v1/branding/facade/branding.facade.ts    [now]
v1/branding/__tests__/fakes.ts           [now]
v1/branding/__tests__/create-branding-test-app.ts [now]
v1/branding/__tests__/branding.controller.e2e.spec.ts [now]
v1/branding/__tests__/branding.service.spec.ts [now]
v1/branding/__tests__/branding.transformer.spec.ts [now]
v1/branding/__tests__/branding.transport.spec.ts [now]
v1/branding/__tests__/branding.facade.spec.ts [now]
v1/branding/__tests__/currencies-change.handler.spec.ts [now] both names subscribed; either drops the memo
v1/branding/__tests__/branding.int.spec.ts [now] the real path through both facades on the local MySQL: GET /api/v1/branding, shape only
v1/identity/README.md                    [now] ## Owned tables names the four; departments through DepartmentsFacade, no departments table; the security notes
v1/identity/identity.module.ts           [now] not global; imports DepartmentsModule; provides IdentityDepartmentLinks; exports IdentityFacade
v1/identity/identity.routes.ts           [now] IDENTITY_ROUTES (with members/export, roles/export), MEMBER_EXPORT_COLUMNS, ROLE_EXPORT_COLUMNS (the export columns of every format), IDENTITY_PERMISSIONS, IDENTITY_CHANGE_TYPES (see below)
v1/identity/index.ts                     [now] IdentityFacade and the StaffMember, MemberState, PerfexPermissionRow, StaffName, StaffContact types
v1/identity/controller/identity.controller.ts [now] six member handlers and six role handlers (each list's export, replyExport, all four formats), the catalogue, the department and locale pickers, the admin-only GET audit; the two member saves declare ERP-IDENTITY-0009
v1/identity/service/identity.service.ts  [now] the one-transaction save; profile, departments, permissions and the audit row; a department id NEW for the member and unknown to DepartmentsFacade refused before the transaction (422 ERP-IDENTITY-0009; stored leftover links still save); exportMembers and exportRoles: MEMBER_EXPORT_CELLS and ROLE_EXPORT_CELLS through runExport (keys: 'refuse'); setMemberStatus through the private applyStatus: nobody deactivates themselves, only an administrator changes an administrator's status
v1/identity/service/granting-policy.ts   [now] pure: is this change a grant, and may this actor make it; every role write is one
v1/identity/service/identity.validator.ts [now] zod safeParse -> AppError('ERP-VALIDATION-0001'); MEMBER_SORT_FIELDS, ROLE_SORT_FIELDS, the sort-bound cursor, parseMemberExportList and parseRoleExportList (the list request of an export)
v1/identity/service/identity.enricher.ts [now] Perfex rows and a role template -> clean names; the catalogue from @erp/contracts
v1/identity/service/identity.transformer.ts [now] the profileImageUrl rule
v1/identity/service/identity.transport.ts [now] the event port and DepartmentsFacade: listDepartments = listForPicker, knownDepartmentIds = existingIds; in-process, no outbound HTTP
v1/identity/service/identity-department-links.ts [now] IdentityDepartmentLinks: from onModuleInit registers the staffMembers counter (distinct staff in tblstaff_departments) and the staff directory (listActiveMembers, namesOf) with DepartmentsFacade, so departments never imports identity
v1/identity/repository/identity.repository.ts [now] the only Prisma caller; opens the transaction the service orchestrates; keyset pages, countMembers/countRoles from one where; no tbldepartments read; countDepartmentMembers, the distinct staff of a department (the registered counter)
v1/identity/repository/identity-audit.repository.ts [now] APPEND-ONLY: one write method, no update and no delete
v1/identity/repository/permission-rows.codec.ts [now] clean name <-> the Perfex feature/capability row pair
v1/identity/model/identity.model.ts      [now] the member, role, audit, department and catalogue types; MEMBER_LIST_FIELDS, ROLE_LIST_FIELDS, AUDIT_LIST_FIELDS and the keyset list requests
v1/identity/dto/identity.dto.ts          [now] z.strictObject bodies: a mistyped granting field is a 400; list meta is listPageMetaSchema plus exportLimit and printLimit; an export query is its list query minus limit/cursor, plus the export fields of export.ts (no key)
v1/identity/events/published.ts          [now] seven member events + three identity.role.*
v1/identity/events/subscribed.ts         [now] [] as const
v1/identity/facade/identity.facade.ts    [now] permissionsOf(staffId), the ONE cross-module surface; contactOf(staffId) { email, locale, active } for v1/mail, which never names tblstaff; listActiveMembers() and namesOf(ids) for the departments staff directory
v1/identity/__tests__/fakes.ts           [now] FakeIdentityRepository, FakeIdentityAuditRepository and the seed members, roles and permission rows
v1/identity/__tests__/create-identity-test-app.ts [now] DepartmentsModule replaced by stubDepartmentsModule over a FakeDepartmentsFacade
v1/identity/__tests__/identity.controller.e2e.spec.ts [now] granting refused on the wire for a member holding every code
v1/identity/__tests__/identity.service.spec.ts [now]
v1/identity/__tests__/identity.service.int.spec.ts [now] a forced mid-save failure leaves NO row, audit row included
v1/identity/__tests__/granting-policy.spec.ts [now] all 507 catalogue codes still refuse a non-admin
v1/identity/__tests__/identity.validator.spec.ts [now]
v1/identity/__tests__/identity.enricher.spec.ts [now]
v1/identity/__tests__/identity.transformer.spec.ts [now]
v1/identity/__tests__/identity.transport.spec.ts [now]
v1/identity/__tests__/identity-department-links.spec.ts [now] the counter and the directory registered at init; the counter answers distinct staff per department
v1/identity/__tests__/identity.facade.spec.ts [now]
v1/identity/__tests__/identity.repository.int.spec.ts [now]
v1/identity/__tests__/identity-audit.repository.int.spec.ts [now] one row per change; the prototype is exactly append + list
v1/identity/__tests__/permission-rows.codec.spec.ts [now]
v1/identity/__tests__/route-gates.spec.ts [now] every handler's decorators vs @erp/contracts' ROUTE_GATES; 'admin' means no @Permissions plus the service's assertion; the whole sorted key set pinned
v1/expense-categories/                   [now] the pilot: a copy of the template reshaped by hand; administrators only; the shape the next Setup lists copy
v1/expense-categories/README.md          [now] the owned table, the three read-only usage sources, the two co-writers, the parity table; no tblactivity_log row
v1/expense-categories/expense-categories.module.ts [now] not global; exports ExpenseCategoriesFacade
v1/expense-categories/expense-categories.routes.ts [now] EXPENSE_CATEGORIES_ROUTES (list, export, record), EXPENSE_CATEGORIES_EXPORT_COLUMNS (every format); no permission map (administrators only)
v1/expense-categories/index.ts           [now] the facade and the ExpenseCategory, ExpenseCategoryId types
v1/expense-categories/controller/expense-categories.controller.ts [now] list, export (replyExport, all four formats), get, create, update and the DELETE (204); both guards, no permission code, @CurrentUser() on every handler
v1/expense-categories/service/expense-categories.service.ts [now] assertAdministrator (ERP-AUTH-0005) first in every use case; exportCsv: EXPENSE_CATEGORIES_EXPORT_CELLS through runExport (keys: 'refuse'); the delete refused with 409 ERP-EXPENSECATEGORIES-0001 while in use or when the use cannot be counted; one event per write, one log line per delete
v1/expense-categories/service/expense-categories.validator.ts [now] EXPENSE_CATEGORIES_SORT_FIELDS (name default, id), the sort-bound cursor, q; parseExportList (the list request of an export); strict bodies -> AppError('ERP-VALIDATION-0001')
v1/expense-categories/service/expense-categories.transformer.ts [now] the description codec: toStoredDescription (Perfex nl2br), fromStoredDescription (clear_textarea_breaks); the list row with its three usage counts; meta with exportLimit and printLimit
v1/expense-categories/service/expense-categories.transport.ts [now] the event port; no outbound HTTP
v1/expense-categories/repository/expense-categories.repository.ts [now] tblexpenses_categories through Prisma; usage over tblexpenses, tblacc_expense_category_mappings and tblpur_petty_cash_advances when present
v1/expense-categories/model/expense-categories.model.ts [now] ExpenseCategory, NewExpenseCategory, ExpenseCategoryUsage, ExpenseCategoryId
v1/expense-categories/dto/expense-categories.dto.ts [now] list/export/params schemas (the export fields of export.ts, no key), strict create body and its .partial() update, the list row with its three counts, meta with exportLimit and printLimit, EXPENSE_CATEGORIES_NAME_MAX (191)
v1/expense-categories/events/published.ts [now] ExpenseCategoriesCreatedV1, ExpenseCategoriesUpdatedV1, ExpenseCategoriesDeletedV1
v1/expense-categories/events/subscribed.ts [now]
v1/expense-categories/facade/expense-categories.facade.ts [now] describe(), findById(id): the stored model, never the wire DTO
v1/expense-categories/__tests__/fakes.ts [now] InMemoryExpenseCategoriesRepository with a settable usage map; asRepository, seededStore
v1/expense-categories/__tests__/create-expense-categories-test-app.ts [now] TEST_BEARERS admin, everyCode, noPermission; RecordingLogger; LoggerModule
v1/expense-categories/__tests__/expense-categories.controller.e2e.spec.ts [now] a member holding every code is refused; the DELETE's 204, 404 and 409
v1/expense-categories/__tests__/expense-categories.service.spec.ts [now]
v1/expense-categories/__tests__/expense-categories.validator.spec.ts [now]
v1/expense-categories/__tests__/expense-categories.transformer.spec.ts [now] the codec: a read value saved again is stored byte-identically
v1/expense-categories/__tests__/expense-categories.transport.spec.ts [now]
v1/expense-categories/__tests__/expense-categories.facade.spec.ts [now]
v1/expense-categories/__tests__/expense-categories.repository.spec.ts [now] a stubbed client: the petty-cash table PRESENT, its name and the ids bound, a failing probe or count rejects
v1/expense-categories/__tests__/expense-categories.repository.int.spec.ts [now] the local MySQL, its own int-spec-04.1-04 rows; the petty-cash table ABSENT
v1/expense-categories/__tests__/route-gates.spec.ts [now] every handler administrator-only against @erp/contracts' ROUTE_GATES (/setup/expense-categories)
v1/taxes/                                [now] a copy of the template (forms: singular tax, plural taxes) reshaped by hand on the pilot's shape; administrators only
v1/taxes/README.md                       [now] the owned table, the Subscriptions co-writer, the default_tax read, the nine usage groups of TAX_REFERENCES, the parity table; no tblactivity_log row
v1/taxes/taxes.module.ts                 [now] not global; exports TaxesFacade
v1/taxes/taxes.routes.ts                 [now] TAXES_ROUTES (list, export, record), TAXES_EXPORT_COLUMNS (id, name, rate), TAXES_EXPORT_FILE_STEM; no permission map (administrators only)
v1/taxes/index.ts                        [now] the facade and the Tax, TaxId types
v1/taxes/controller/taxes.controller.ts  [now] list, export (replyExport, all four formats), get, create, update and the DELETE (204); both guards, no permission code, @CurrentUser() on every handler
v1/taxes/service/taxes.service.ts        [now] assertAdministrator (ERP-AUTH-0005) first in every use case; the delete refused with 409 ERP-TAXES-0001 while in use or when the use cannot be counted; an edit refused with 0002 while an expense or a subscription uses the tax (Perfex's lock), 0003 for a duplicate name, 0004 while default_tax names it; findById, listAll, findByIds for the facade; one event per write, one log line per change
v1/taxes/service/taxes.validator.ts      [now] TAXES_SORT_FIELDS (rate default, name, id), the sort-bound cursor, q (the name, the rate, and the id when all digits within INT); parseExportList; strict bodies -> AppError('ERP-VALIDATION-0001')
v1/taxes/service/taxes.transformer.ts    [now] roundRate (two decimals, at most 13 integer digits), isNamedInDefaultTaxes (Perfex's substring match on default_tax), NO_TAX_USAGE; the row with its nine usage groups and isDefault; toTax for the facade
v1/taxes/service/taxes.transport.ts      [now] the event port; no outbound HTTP
v1/taxes/repository/taxes.repository.ts  [now] tbltaxes through Prisma; findOtherByName on the _ci collation; the usage reads over TAX_REFERENCES (20 statements, nine groups, ids bound, a |-joined id list matched with FIND_IN_SET over REGEXP_REPLACE); the default_tax read from tbloptions, read only
v1/taxes/model/taxes.model.ts            [now] TaxRow, NewTax, TaxUsage, Tax, TaxId, TaxesSortField, TAXES_FACADE_MAX_ROWS (1000)
v1/taxes/dto/taxes.dto.ts                [now] list/export/params schemas, strict create body {name, rate} and its .partial() update (no | in a name, RATE_PATTERN), the row with taxUsageSchema and isDefault, TAXES_NAME_MAX (100)
v1/taxes/events/published.ts             [now] TaxesCreatedV1, TaxesUpdatedV1, TaxesDeletedV1
v1/taxes/events/subscribed.ts            [now]
v1/taxes/facade/taxes.facade.ts          [now] describe(), findById, listAll (refused above 1000, never truncated), findByIds: the stored Tax, never the wire DTO
v1/taxes/__tests__/fakes.ts              [now] InMemoryTaxesRepository with settable usage and defaultTax answers; asRepository, seedRepository, seededStore
v1/taxes/__tests__/create-taxes-test-app.ts [now] TEST_BEARERS admin, everyCode, noPermission; RecordingLogger; LoggerModule
v1/taxes/__tests__/taxes.controller.e2e.spec.ts [now] a member holding every code is refused; the four 409s; the DELETE's 204, 404 and 409
v1/taxes/__tests__/taxes.service.spec.ts [now]
v1/taxes/__tests__/taxes.validator.spec.ts [now]
v1/taxes/__tests__/taxes.transformer.spec.ts [now] roundRate and the default_tax match
v1/taxes/__tests__/taxes.transport.spec.ts [now]
v1/taxes/__tests__/taxes.facade.spec.ts  [now]
v1/taxes/__tests__/taxes.repository.spec.ts [now] a stubbed client: one statement per TAX_REFERENCES table, the table in the text and the ids in the values; one rejecting statement rejects the answer (fail closed)
v1/taxes/__tests__/taxes.repository.int.spec.ts [now] the local MySQL, its own int-spec-04.1-11 rows; the FIND_IN_SET matcher on bound literals; the name collation
v1/taxes/__tests__/route-gates.spec.ts   [now] every handler administrator-only against @erp/contracts' ROUTE_GATES (/setup/taxes)
v1/cost-centers/                         [now] a copy of the template (forms: singular cost-center, plural cost-centers) reshaped by hand on the Taxes shape; administrators only
v1/cost-centers/README.md                [now] the owned table, no co-writer, created_by and datecreated written as Perfex writes them, the six candidates of COST_CENTER_REFERENCES, the parity table; no tblactivity_log row
v1/cost-centers/cost-centers.module.ts   [now] not global; imports SettingsModule; exports CostCentersFacade
v1/cost-centers/cost-centers.routes.ts   [now] COST_CENTERS_ROUTES (list, export, record), COST_CENTERS_EXPORT_COLUMNS (id, name, dateCreated), COST_CENTERS_EXPORT_FILE_STEM; no permission map (administrators only)
v1/cost-centers/index.ts                 [now] the facade and the CostCenter, CostCenterId types
v1/cost-centers/controller/cost-centers.controller.ts [now] list, export (replyExport, all four formats), get, create, update and the DELETE (204); both guards, no permission code, @CurrentUser() on every handler
v1/cost-centers/service/cost-centers.service.ts [now] assertAdministrator (ERP-AUTH-0005) first in every use case; the delete refused with 409 ERP-COSTCENTERS-0001 while in use or when the use cannot be counted; create writes created_by (the actor) and datecreated (the wall clock), update the name only; findById, listAll, findByIds for the facade; one event per write, one log line per change
v1/cost-centers/service/cost-centers.validator.ts [now] COST_CENTERS_SORT_FIELDS (id descending by default, Perfex's order; name), the sort-bound cursor, q (the name, and the id when all digits); parseExportList; strict bodies -> AppError('ERP-VALIDATION-0001')
v1/cost-centers/service/cost-centers.transformer.ts [now] companyZone (default_timezone through SettingsFacade, UTC when unset or unknown), wallClockAt (the write: Perfex's wall clock, seconds kept) and instantOf (the read: that wall clock as an ISO instant); NO_COST_CENTER_USAGE; COST_CENTERS_EXPORT_CELLS with dateCreated kind dateTime (the date and the time with seconds, as Perfex's _d() through _dt()); toCostCenter for the facade
v1/cost-centers/service/cost-centers.transport.ts [now] the event port and default_timezone through SettingsFacade (settings/index.js); no outbound HTTP
v1/cost-centers/repository/cost-centers.repository.ts [now] tblcost_centers through Prisma; COST_CENTER_REFERENCES (six candidates: five by id, fixed_equipment's tblfe_asset_creation.cost_centre by name, CAST AS BINARY), probed in information_schema.COLUMNS on every usage read (presentReferences, never cached; an absent column counts 0); ids bound, one Promise.all, fail closed; no DDL
v1/cost-centers/model/cost-centers.model.ts [now] CostCenterRow, NewCostCenter, CostCenterUsage, CostCenter, CostCenterId, CostCentersSortField, COST_CENTERS_FACADE_MAX_ROWS (1000)
v1/cost-centers/dto/cost-centers.dto.ts  [now] list/export/params schemas, the strict body {name} (trimmed, 1 to 255, every character kept) for create and update, the row with costCenterUsageSchema and a nullable dateCreated, COST_CENTERS_NAME_MAX (255)
v1/cost-centers/events/published.ts      [now] CostCentersCreatedV1, CostCentersUpdatedV1, CostCentersDeletedV1
v1/cost-centers/events/subscribed.ts     [now]
v1/cost-centers/facade/cost-centers.facade.ts [now] describe(), findById, listAll (refused above 1000, never truncated), findByIds: the stored CostCenter {id, name}, never the wire DTO; what the Expenses and shipping-charge slices read
v1/cost-centers/__tests__/fakes.ts       [now] InMemoryCostCentersRepository: stored rows seeded directly, settable usage, presentReferences answers every declared key; asRepository, seededStore
v1/cost-centers/__tests__/create-cost-centers-test-app.ts [now] TEST_BEARERS admin, everyCode, noPermission; RecordingLogger; LoggerModule; SettingsModule stubbed with default_timezone
v1/cost-centers/__tests__/cost-centers.controller.e2e.spec.ts [now] a member holding every code is refused; the DELETE's 204, 404 and 409
v1/cost-centers/__tests__/cost-centers.service.spec.ts [now]
v1/cost-centers/__tests__/cost-centers.validator.spec.ts [now]
v1/cost-centers/__tests__/cost-centers.transformer.spec.ts [now] wallClockAt and instantOf round trips across zone changes; companyZone's fallback
v1/cost-centers/__tests__/cost-centers.transport.spec.ts [now]
v1/cost-centers/__tests__/cost-centers.facade.spec.ts [now]
v1/cost-centers/__tests__/cost-centers.repository.spec.ts [now] a stubbed client: the probe's names bound, one statement per present candidate, a missing column counts 0 and raises no error, the asset statement compares as BINARY; one rejecting statement rejects the answer (fail closed)
v1/cost-centers/__tests__/cost-centers.repository.int.spec.ts [now] the local MySQL, its own int-spec-04.1-18 rows; the probe equals a direct information_schema read; the wall clock stored verbatim; a rename leaves created_by and datecreated unchanged
v1/cost-centers/__tests__/route-gates.spec.ts [now] every handler administrator-only against @erp/contracts' ROUTE_GATES (/setup/cost-centers)
v1/payment-modes/                        [now] a copy of the template (forms: singular payment-mode, plural payment-modes) reshaped by hand on the Cost Centers shape; administrators only
v1/payment-modes/README.md               [now] the owned table, no co-writer, the eight counted columns of PAYMENT_MODE_REFERENCES and the four configuration columns never counted, the description stored as Perfex stores it, the credit-expense lock, the parity table; no tblactivity_log row
v1/payment-modes/payment-modes.module.ts [now] not global; imports SettingsModule; exports PaymentModesFacade
v1/payment-modes/payment-modes.routes.ts [now] PAYMENT_MODES_ROUTES (list, export, record, active), PAYMENT_MODES_EXPORT_COLUMNS (id, name, description, active), PAYMENT_MODES_EXPORT_FILE_STEM; no permission map (administrators only)
v1/payment-modes/index.ts                [now] the facade and the PaymentMode, PaymentModeId types
v1/payment-modes/controller/payment-modes.controller.ts [now] list, export (replyExport, all four formats), get, create, update, the PATCH :id/active switch and the DELETE (204); both guards, no permission code, @CurrentUser() on every handler
v1/payment-modes/service/payment-modes.service.ts [now] assertAdministrator (ERP-AUTH-0005) first in every use case; the switch writes active alone and a flag already so answers with no write, event or log line; the delete refused with 409 ERP-PAYMENTMODES-0002 while expense_credit_payment_mode names the mode (checked first), then ERP-PAYMENTMODES-0001 while in use or when the use cannot be counted; findById, listAll, findByIds for the facade; one event per write, one log line per change
v1/payment-modes/service/payment-modes.validator.ts [now] PAYMENT_MODES_SORT_FIELDS (the name ascending by default, Perfex's order; id, active), the sort-bound cursor, q (the name or the description, and the id when all digits); parseExportList; parseActiveBody; strict bodies -> AppError('ERP-VALIDATION-0001')
v1/payment-modes/service/payment-modes.transformer.ts [now] toStoredDescription and fromStoredDescription (Perfex's nl2br_save_html and clear_textarea_breaks), creditModeIdOf and isCreditExpenseMode (PHP's (int) cast), toFlag and fromFlag (an unticked box saves 0); NO_PAYMENT_MODE_USAGE; PAYMENT_MODES_EXPORT_CELLS (active 1 or 0, the sent words in PDF and Print); toPaymentMode for the facade
v1/payment-modes/service/payment-modes.transport.ts [now] the event port and expense_credit_payment_mode through SettingsFacade (settings/index.js; the option's value never answered); no outbound HTTP
v1/payment-modes/repository/payment-modes.repository.ts [now] tblpayment_modes through Prisma (the keyset list; the active sort with equality, activeKeyset); PAYMENT_MODE_REFERENCES (eight candidates holding the id as text, compared as exact text with CAST AS BINARY; the accounting mappings and allowed lists never counted), probed in information_schema.COLUMNS on every usage read (presentReferences, never cached; an absent column counts 0); ids bound, one Promise.all, fail closed; no DDL
v1/payment-modes/model/payment-modes.model.ts [now] PaymentModeRow, NewPaymentMode, PaymentModeUsage, PaymentMode, PaymentModeId, PaymentModesSortField, PAYMENT_MODES_FACADE_MAX_ROWS (1000)
v1/payment-modes/dto/payment-modes.dto.ts [now] list/export/params schemas, the strict seven-field body (the name trimmed, 1 to 100, every character kept; the description and the five boxes optional) for create and update, the strict {active} body, the row with paymentModeUsageSchema and isCreditExpenseMode, PAYMENT_MODES_NAME_MAX (100)
v1/payment-modes/events/published.ts     [now] PaymentModesCreatedV1, PaymentModesUpdatedV1, PaymentModesActiveChangedV1, PaymentModesDeletedV1 (ids only)
v1/payment-modes/events/subscribed.ts    [now]
v1/payment-modes/facade/payment-modes.facade.ts [now] describe(), findById, listAll (refused above 1000, never truncated), findByIds: the stored PaymentMode {id, name, five flags as booleans}, never the description or the wire DTO; what the invoices and expenses slices read
v1/payment-modes/__tests__/fakes.ts      [now] InMemoryPaymentModesRepository: stored rows seeded, settable usage, presentReferences answers every declared key; asRepository, seededStore
v1/payment-modes/__tests__/create-payment-modes-test-app.ts [now] TEST_BEARERS admin, everyCode, noPermission; RecordingLogger; LoggerModule; SettingsModule stubbed with expense_credit_payment_mode
v1/payment-modes/__tests__/payment-modes.controller.e2e.spec.ts [now] a member holding every code is refused; the switch's 200 and its no-op; the DELETE's 204, 404 and both 409s
v1/payment-modes/__tests__/payment-modes.service.spec.ts [now]
v1/payment-modes/__tests__/payment-modes.validator.spec.ts [now]
v1/payment-modes/__tests__/payment-modes.transformer.spec.ts [now] the description codec on Perfex's cases (a line ending in a closing tag, the str_ireplace order) and the (int) cast's numeric prefix
v1/payment-modes/__tests__/payment-modes.transport.spec.ts [now]
v1/payment-modes/__tests__/payment-modes.facade.spec.ts [now]
v1/payment-modes/__tests__/payment-modes.repository.spec.ts [now] a stubbed client: the probe's names bound, one statement per present candidate compared as exact text, a missing column counts 0 and raises no error, configuration never counted; activeKeyset; one rejecting statement rejects the answer (fail closed)
v1/payment-modes/__tests__/payment-modes.repository.int.spec.ts [now] the local MySQL, its own int-spec-04.1-23 rows; the probe equals a direct information_schema read; every candidate counted as exact text; the description stored as Perfex stores it; paging by active both ways
v1/payment-modes/__tests__/route-gates.spec.ts [now] every handler administrator-only against @erp/contracts' ROUTE_GATES (/setup/payment-modes)
v1/currencies/                           [now] a copy of the template (forms: singular currency, plural currencies) reshaped by hand on the Payment Modes shape, no enricher; administrators only; imports no v1 module, so another module may import it
v1/currencies/README.md                  [now] the owned table, no co-writer, the one reference register CURRENCY_REFERENCES, the registered uses, the base rule, the code lock (widened, permanent), the parity table; no tblactivity_log row
v1/currencies/currencies.module.ts       [now] not global; imports no v1 module; provides CurrencyUsageRegistry; exports CurrenciesFacade
v1/currencies/currencies.routes.ts       [now] CURRENCIES_ROUTES (list, export, record, makeBase :id/base), CURRENCIES_EXPORT_COLUMNS (name, symbol, isBase), CURRENCIES_EXPORT_FILE_STEM; no permission map (administrators only)
v1/currencies/index.ts                   [now] the facade and the Currency, CurrencyId, CurrencyUsageCounter types
v1/currencies/controller/currencies.controller.ts [now] list, export (replyExport, all four formats), get, create, update, the PATCH :id/base make-base (an empty body) and the DELETE (204); both guards, no permission code, @CurrentUser() on every handler
v1/currencies/service/currencies.service.ts [now] assertAdministrator (ERP-AUTH-0005) first in every use case; make-base only while the current base has no use in Perfex's seven core columns (409 ERP-CURRENCIES-0004), the base itself answered with no write; the delete refused in order while an id line of the register holds it (0001), while it is the base (0002), while a registered use counts it (0003); a code change refused while anything uses it, a register line or a registered use (0005); an unreadable count refuses with its own code; registerUsage, listAll, baseCurrency for the facade; one event per write, one log line per change
v1/currencies/service/currencies.validator.ts [now] CURRENCIES_SORT_FIELDS (the code descending by default, Perfex's order; symbol, id), the sort-bound cursor, q (the code or the symbol, and the id when all digits); parseExportList; parseBaseBody (no body reads as {}); strict bodies -> AppError('ERP-VALIDATION-0001')
v1/currencies/service/currencies.transformer.ts [now] the 409 details (inUseDetail, BASE_DETAIL, registeredDetail, baseLockedDetail, codeLockedDetail, NOT_COUNTED, groups joined as a, b and c); coreInUse, inUseGroups, lockGroups, isInUseAtAll, registeredRecord; CURRENCIES_EXPORT_CELLS (isBase as the sent words in PDF and Print); toCurrency for the facade
v1/currencies/service/currencies.transport.ts [now] the event port only; no other module is reached from here and no outbound HTTP
v1/currencies/service/currency-usage.registry.ts [now] CurrencyUsageRegistry: the counters other modules register from their own onModuleInit (key, module, noun, count); a malformed or duplicate key throws at boot; counters() sorted by key; a counter answers one number, never ids
v1/currencies/repository/currencies.repository.ts [now] tblcurrencies through Prisma (the keyset list, findBase); CURRENCY_REFERENCES, the one register: 40 lines in 27 groups, each an integer id, an id as text or a code as text, probed in information_schema.COLUMNS with DATA_TYPE on every read (presentReferences, never cached; an absent column counts 0); the id lines count for a delete, the exchange rates and their logs never; every line counts for the code lock; setBase sets isdefault on one row and clears the others in one transaction (setBaseIn, Currencies_model.php:153-161); ids bound, fail closed; no DDL
v1/currencies/model/currencies.model.ts  [now] CurrencyRow, NewCurrency, CurrencyUsage, CurrencyLockUsage, CurrencyReferenceCounts, CORE_USAGE_GROUPS (Perfex's seven), Currency, CurrencyId, CurrenciesSortField, CURRENCIES_FACADE_MAX_ROWS (1000)
v1/currencies/dto/currencies.dto.ts      [now] list/export/params schemas, the strict five-field body (the code through @erp/contracts' shared currency-code schema, toCurrencyCode and currencyCodeProblem, at most 3; the symbol 1 to 10 with a character; Perfex's separators and placement) for create and update, the strict empty make-base body, the row with usage, lockUsage, registeredUsage, isBase and canMakeBase
v1/currencies/events/published.ts        [now] CurrenciesCreatedV1, CurrenciesUpdatedV1, CurrenciesBaseChangedV1 ({ id, previousId, at }), CurrenciesDeletedV1 (ids only); branding subscribes to baseChanged and updated
v1/currencies/events/subscribed.ts       [now]
v1/currencies/facade/currencies.facade.ts [now] describe(), registerUsage, listAll (refused above 1000, never truncated), baseCurrency (the first isdefault row or null): the stored Currency, never a count or the wire DTO; what branding reads
v1/currencies/__tests__/fakes.ts         [now] InMemoryCurrenciesRepository: stored rows seeded, every call recorded, settable usage and usageError; asRepository, seededStore; FakeCurrenciesFacade (registerUsage through a real registry) and stubCurrenciesModule for other modules' test apps
v1/currencies/__tests__/create-currencies-test-app.ts [now] TEST_BEARERS admin, everyCode, noPermission; RecordingLogger; LoggerModule; a probeRows counter registered through the real facade at init (SettableUsageCounter)
v1/currencies/__tests__/currencies.controller.e2e.spec.ts [now] a member holding every code is refused; make-base's 200, its no-op and 0004; the DELETE's 204, 404 and the 0001 to 0003 refusals; the code lock 0005
v1/currencies/__tests__/currencies.service.spec.ts [now]
v1/currencies/__tests__/currencies.validator.spec.ts [now]
v1/currencies/__tests__/currencies.transformer.spec.ts [now]
v1/currencies/__tests__/currencies.transport.spec.ts [now]
v1/currencies/__tests__/currency-usage.registry.spec.ts [now] stores and sorts the counters, a duplicate or malformed key throws; currencies imports no other v1 module
v1/currencies/__tests__/currencies.facade.spec.ts [now]
v1/currencies/__tests__/currencies.repository.spec.ts [now] a stubbed client: the probe's names bound, an integer line read by value only when DATA_TYPE is an integer type, text lines compared as exact bytes, a missing column counts 0 and raises no error; one rejecting statement rejects the answer (fail closed)
v1/currencies/__tests__/currency-references.spec.ts [now] the register: every column exists, each once, the three kinds, the 24 delete groups, the exchange rates, their logs and the payslip codes never counted for a delete; no tblcheque_management or tblacc_checks line
v1/currencies/__tests__/currencies.repository.int.spec.ts [now] the local MySQL, its own ZZA to ZZC marker rows; the probe equals a direct information_schema read; every present line counted; the exact-byte expressions; the symbol column's length; the base switch in a rolled-back transaction
v1/currencies/__tests__/route-gates.spec.ts [now] every handler administrator-only against @erp/contracts' ROUTE_GATES (/setup/currencies)
v1/departments/                          [now] read-only: a copy of the template (forms: singular department, plural departments) reshaped by hand on the Currencies shape, no enricher, no transport; administrators only; reads six columns of Perfex-owned tbldepartments and writes nothing (no create, update or delete route); imports no v1 module, so identity may import it
v1/departments/README.md                 [now] no owned table: tbldepartments is Perfex's and Node reads six columns; the one reference register DEPARTMENT_REFERENCES line by line with owner and kind, the facade's four methods, the five read endpoints, the parity table; no events
v1/departments/departments.module.ts     [now] not global; imports no v1 module; provides DepartmentLinksRegistry; exports DepartmentsFacade
v1/departments/departments.routes.ts     [now] DEPARTMENTS_ROUTES (list, export, managers, options, record), DEPARTMENTS_EXPORT_COLUMNS (id, name, calendarId; no Email column), DEPARTMENTS_EXPORT_FILE_STEM; no permission map (administrators only)
v1/departments/index.ts                  [now] the facade and the DepartmentName, DepartmentUsageCounter, DepartmentStaffDirectory types
v1/departments/controller/departments.controller.ts [now] five GET handlers: list, export (replyExport, all four formats), the managers and options pickers (declared before :id) and get; no write route; both guards, no permission code, @CurrentUser() on every handler
v1/departments/service/departments.service.ts [now] assertAdministrator (ERP-AUTH-0005) first in list, exportCsv, managers, options and get; the register's counts, the registered counters and the names read in one Promise.all, failing closed; no write use case; the facade paths
v1/departments/service/departments.validator.ts [now] DEPARTMENTS_SORT_FIELDS (the name ascending by default, Perfex's order; id, calendarId), the sort-bound cursor (a NULL calendar id as false), q (the name or the calendar id, and the id when all digits); parseExportList, parseParams; no body
v1/departments/service/departments.transformer.ts [now] the record and the list envelope field by field from the six columns (never a mailbox field); the export cells; the picker shape and the two picker answers
v1/departments/service/department-links.registry.ts [now] DepartmentLinksRegistry: the usage counters other modules register from their own onModuleInit (key, module, noun, count) and the one staff directory (listActive, namesOf); a malformed or duplicate key, or a second directory, throws at boot; a counter answers one number, never ids
v1/departments/repository/departments.repository.ts [now] tbldepartments read through Prisma on DEPARTMENT_COLUMNS, the six-column allow-list that is the select of every row-returning call; DEPARTMENT_REFERENCES, the one register: 18 lines, integer ids, comma id lists and JSON id lists, probed in information_schema.COLUMNS on every read (an absent column counts 0), the approval settings and child departments counted, name snapshots excluded; the keyset list, count, findById, findAll, findByIds; no write, no DDL
v1/departments/model/departments.model.ts [now] DepartmentRow, DepartmentUsage, DepartmentName, DepartmentId, DepartmentsSortField, DepartmentsListRequest, DepartmentsPage, DEPARTMENTS_FACADE_MAX_ROWS (1000)
v1/departments/dto/departments.dto.ts    [now] the list, export and params schemas, the record (with usage and registeredUsage) and the list envelope, the managers and options answers (DEPARTMENTS_SEARCH_MAX); no request body
v1/departments/events/published.ts       [now] DEPARTMENTS_PUBLISHED_EVENTS = []: the module changes nothing
v1/departments/events/subscribed.ts      [now]
v1/departments/facade/departments.facade.ts [now] describe(), registerUsage and registerStaffDirectory (identity's), listForPicker ({ departmentId, name } by name then id, refused above 1000, never truncated) and existingIds; no write, no actor
v1/departments/__tests__/fakes.ts        [now] InMemoryDepartmentsRepository, the read-only store; SEED_DEPARTMENTS, SEED_PICKER, asRepository, seededStore; FakeDepartmentsFacade and stubDepartmentsModule for other modules' test apps
v1/departments/__tests__/create-departments-test-app.ts [now] TEST_BEARERS admin, everyCode, noPermission; RecordingLogger; TEST_NOW; a SettableUsageCounter and a FakeStaffDirectory registered through the real facade at init
v1/departments/__tests__/departments.controller.e2e.spec.ts [now] the five read routes and no write route; a member holding every code is refused; the list and the record; the pickers; every export format
v1/departments/__tests__/departments.service.spec.ts [now] administrators only; no write use case; a read fails closed when a counter rejects
v1/departments/__tests__/departments.validator.spec.ts [now]
v1/departments/__tests__/departments.transformer.spec.ts [now] the record from the six columns, the names and the counts; the export row and the picker shape
v1/departments/__tests__/department-links.registry.spec.ts [now] stores the counters and the one directory, a duplicate or malformed key and a second directory throw
v1/departments/__tests__/departments.facade.spec.ts [now] the four facade methods; no method asserts the administrator flag
v1/departments/__tests__/departments.repository.spec.ts [now] a stubbed client: the register cases (the probe's names bound, each kind matched, an absent column counts 0, one rejecting statement rejects the answer); the keyset list
v1/departments/__tests__/department-references.spec.ts [now] the register: every column exists, each once, the three kinds (the absent tables, tblacc_approval_setting among them); eighteen groups in the usage record order; neither tblstaff_departments nor a name snapshot; departments imports no other v1 module
v1/departments/__tests__/department-columns.spec.ts [now] the guard over every non-test file of src: the allow-list is exactly the six keys; every row-returning tbldepartments call selects DEPARTMENT_COLUMNS; nothing writes tbldepartments; no file names a mailbox column; only the departments repository names tbldepartments; planted copies prove each
v1/departments/__tests__/departments.repository.int.spec.ts [now] the local MySQL, read only: the probe, every usage count against an independent count, every row through exactly the six columns, listForPicker against a direct read
v1/settings/                             [now] the one facade-only module (BE-01), written by hand; reads tbloptions (unattributed, Perfex-owned) and writes nothing
v1/settings/README.md                    [now] the ten headings (Endpoints and both Events sections None); the allow-list of 11 names by consumer
v1/settings/settings.module.ts           [now] not global; no controller; exports SettingsFacade
v1/settings/index.ts                     [now] SettingsFacade and the SettingName type
v1/settings/service/settings.service.ts  [now] getOptions, getOption: a name off the list is ERP-INTERNAL-0001 before any read; every requested name a key, null when absent, rows keyed by name.trimEnd() (Perfex's trailing-space option), the highest id wins for a duplicated name
v1/settings/repository/settings.repository.ts [now] findByNames: one tbloptions findMany (name in, id ascending) + zod; no write
v1/settings/model/settings.model.ts      [now] SETTINGS_ALLOW_LIST (11 names, frozen: branding 10, payment modes 1), SettingName, isSettingName, SettingRow
v1/settings/facade/settings.facade.ts    [now] getOption and getOptions, nothing else; what branding reads
v1/settings/__tests__/fakes.ts           [now] InMemorySettingsRepository: rows in id order matched by the trimmed name, calls recorded; FakeSettingsFacade and stubSettingsModule, shared with branding
v1/settings/__tests__/settings.service.spec.ts [now] the allow-list pinned; null, '', the exact-name, trailing-space and duplicate rules; the refusal before any read
v1/settings/__tests__/settings.facade.spec.ts [now] resolves through the module; the two reads only; a key off the list is a tsc error and a runtime refusal
v1/settings/__tests__/settings.repository.spec.ts [now] a stubbed client: the findMany arguments; a malformed row rejects; no write method
v1/settings/__tests__/settings.repository.int.spec.ts [now] the local MySQL, shape and names only; an off-list name refused before any query
v1/mail/                                 [now] the shared mail sender: a copy of the template reshaped by hand; owns tblmail_templates, tblmail_template_versions, tblmail_sent_emails (prisma/sql/0004-mail.sql, node-created); reads tblemailtemplates once per key to seed
v1/mail/README.md                        [now] the three owned tables, the facade surface (register, legacySlug, ensureSeeded, send never throws), the thirteen endpoints, the three jobs, the Redis keys
v1/mail/mail.module.ts                   [now] not global; imports BrandingModule and IdentityModule; exports MailFacade
v1/mail/mail.routes.ts                   [now] MAIL_ROUTES (thirteen paths), MAIL_PERMISSIONS (settings.emailTemplates.view and .edit)
v1/mail/index.ts                         [now] MailModule, MailFacade, the model types and the registration types (export type *)
v1/mail/controller/mail.controller.ts    [now] thirteen handlers: the template screens on the email_templates pair, the log, Resend and the status administrator-only; @IfMatch() on the save, @Idempotent() on the test sends and Resend; 202 for a queued send
v1/mail/service/mail.service.ts          [now] ensureSeeded (Perfex rows by legacySlug ?? key), preview, enqueue (the row before the job), the screens' use cases; assertAdministrator first for the admin ones; the 5-per-10-minutes test counter
v1/mail/service/mail.validator.ts        [now] the wording rules (required English, both-or-neither, 255 and 20 000, unknown merge field, no U+2014) as one ERP-VALIDATION-0001; isRecipient; the two list queries
v1/mail/service/mail.transformer.ts      [now] every answer of the Email screens re-parsed by its schema; shownOf (the etag columns)
v1/mail/service/mail.transport.ts        [now] brand() from BrandingFacade, contactOf from IdentityFacade, send to EMAIL_PROVIDER, messageIdOf, deferMs from the configured breaker, smtpSettings (never a credential)
v1/mail/service/mail.renderer.ts         [now] pure: renderMail for preview and send; {token} substitution escaped, Object.hasOwn, safeUrl http(s) only, cleanSubject; no template engine
v1/mail/service/mail.layout.ts           [now] pure: the branded email page (inline styles, RTL for ar), escapeHtml, MAIL_COLOURS
v1/mail/service/mail.messages.ts         [now] MAIL_MESSAGES (en, ar) and messageOf: the api's own user-visible mail strings as constants
v1/mail/service/mail-template.registry.ts [now] MailTemplateRegistry: definitions a sending module registers from onModuleInit; sampleValuesOf, urlTokensOf; MailAttachment, attachmentsProblem; the optional legacySlug a definition seeds from
v1/mail/service/html-to-text.ts          [now] pure, seeding only: Perfex's template HTML to text and the formatting-dropped flag
v1/mail/repository/mail.repository.ts    [now] the three tables: keyset lists, the row-locked save, Active per template and per module, the idempotent log insert, the status moves, the one-batch purge; tblemailtemplates read only
v1/mail/repository/mail-state.store.ts   [now] MAIL_STATE_STORE, MailStateStore, mailKeys: mail:server:unreachableSince and mail:test:{staffId} on db 0 (BE-17 Instead)
v1/mail/repository/redis-mail-state.store.ts [now] the ioredis adapter on RedisService.client (db 0); the counter is one MULTI (INCR, PEXPIRE NX, PTTL)
v1/mail/model/mail.model.ts              [now] templates, versions, the sent-email row, statuses and failure reasons, SendRequest, SendOutcome, MAIL_SUBJECT_MAX, MAIL_MESSAGE_MAX
v1/mail/dto/mail.dto.ts                  [now] every request and response schema of the mail wire; strict bodies, so no address rides along
v1/mail/events/published.ts              [now] [] as const: a send is a job, not an event
v1/mail/events/subscribed.ts             [now] [] as const: senders call MailFacade
v1/mail/facade/mail.facade.ts            [now] register, ensureSeeded, send (never throws; queued, duplicate, not_configured, skipped, not_enqueued)
v1/mail/jobs/mail-send.job.ts            [now] MAIL_SEND_QUEUE, MAIL_SWEEP_QUEUE, MAIL_PURGE_QUEUE, the job schema { sentEmailId, draft? }, mailJobId (mail-<id>), enqueueMailSend
v1/mail/jobs/mail-send.processor.ts      [now] mail.send: renders at send time, sends through the transport; sent, retrying (RetryLaterError), failed (NonRetryableJobError), or DeferJobError while the email breaker is open; retryPolicy = RETRY_POLICIES.mailSend, concurrency POOL.smtp.maxConnections; reads attachment bytes from STORAGE at send time
v1/mail/jobs/mail-sweep.processor.ts     [now] mail.sweep every 5 minutes: re-adds non-test rows still queued without a job
v1/mail/jobs/mail-purge.processor.ts     [now] mail.purge daily: deletes log rows older than 12 months, 1000 per batch
v1/mail/__tests__/fakes.ts               [now] FakeEmailProvider (the PORT, never an adapter), FakeMailRepository, FakeQueueService, InMemoryMailStateStore, mailStateStoreContract
v1/mail/__tests__/create-mail-test-app.ts [now] the in-process app: fakes for the repository, state store, port and queue; IdentityModule and BrandingModule stubbed
v1/mail/__tests__/mail.controller.e2e.spec.ts [now] the gates per handler, the stale-guarded save, the idempotent rate-limited test send to the caller only, the log, Resend, the status without a credential
v1/mail/__tests__/mail.service.spec.ts   [now]
v1/mail/__tests__/mail.validator.spec.ts [now]
v1/mail/__tests__/mail.transformer.spec.ts [now]
v1/mail/__tests__/mail.transport.spec.ts [now]
v1/mail/__tests__/mail.facade.spec.ts    [now] send never throws
v1/mail/__tests__/mail.renderer.spec.ts  [now] escaping, substitution, safeUrl, cleanSubject
v1/mail/__tests__/mail.messages.spec.ts  [now]
v1/mail/__tests__/mail-template.registry.spec.ts [now]
v1/mail/__tests__/html-to-text.spec.ts   [now]
v1/mail/__tests__/mail.repository.spec.ts [now] a stubbed client: what it asks the database
v1/mail/__tests__/mail.repository.int.spec.ts [now] the local MySQL; the row lock, the idempotent insert, the batched purge; deletes what it writes
v1/mail/__tests__/mail-state.store.spec.ts [now] the store contract over the in-memory twin
v1/mail/__tests__/redis-mail-state.store.spec.ts [now] a stubbed client: the commands it sends
v1/mail/__tests__/mail-state.store.int.spec.ts [now] the same contract on the local Redis, db 0
v1/mail/__tests__/mail-send.processor.spec.ts [now] the row moves per classified result; the open breaker defers without spending an attempt
v1/mail/__tests__/mail-sweep.processor.spec.ts [now]
v1/mail/__tests__/mail-purge.processor.spec.ts [now]
v1/mail/__tests__/mail-send.int.spec.ts  [now] the sender on the wire against Mailpit: retry on 451, the DLQ on 550, deferral, the sweep (queues on db 3)
v1/mail/__tests__/mail-worker.int.spec.ts [now] WorkerModule registers mail.send, mail.sweep, mail.purge and the two schedulers on db 2
v1/mail/__tests__/route-gates.spec.ts    [now] every handler against @erp/contracts' ROUTE_GATES: the two code-gated screens and the three administrator-only ones
v1/custom-fields/                        [now] read-only: the list, export and record of Perfex's custom fields, administrators only, and a read facade; reads Perfex-owned tblcustomfields and tblcustomfieldsvalues and writes nothing (no create, update, switch or delete route); no Node screen
v1/custom-fields/README.md               [now] no owned table (both are Perfex's), the read facade surface, the three read endpoints, the parity table; no events
v1/custom-fields/custom-fields.module.ts [now] not global; exports CustomFieldsFacade
v1/custom-fields/custom-fields.routes.ts [now] CUSTOM_FIELDS_ROUTES (list, export, record), CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_TYPES, the export columns
v1/custom-fields/index.ts                [now] the facade and its public types
v1/custom-fields/controller/custom-fields.controller.ts [now] the three read handlers (ETag on the record)
v1/custom-fields/service/custom-fields.service.ts [now] the read use cases, assertAdministrator first; the export; the facade's reads
v1/custom-fields/service/custom-fields.validator.ts [now] filter[fieldto][in], the sorts, the export's list request, :id
v1/custom-fields/service/custom-fields.transformer.ts [now] the wire record and the facade's definition
v1/custom-fields/service/custom-field-values.ts [now] the read codec (fromStoredValue) and the options column (splitOptions), as Perfex's handle_custom_fields_post stores them
v1/custom-fields/repository/custom-fields.repository.ts [now] typed reads of tblcustomfields and tblcustomfieldsvalues (owner perfex-core), the grouped value counts; no write
v1/custom-fields/model/custom-fields.model.ts [now]
v1/custom-fields/dto/custom-fields.dto.ts [now]
v1/custom-fields/events/published.ts     [now] CUSTOM_FIELDS_PUBLISHED_EVENTS = []: the module writes nothing
v1/custom-fields/events/subscribed.ts    [now]
v1/custom-fields/facade/custom-fields.facade.ts [now] describe, definitionsFor, valuesFor: reads only
v1/custom-fields/__tests__/fakes.ts      [now]
v1/custom-fields/__tests__/create-custom-fields-test-app.ts [now]
v1/custom-fields/__tests__/custom-fields.controller.e2e.spec.ts [now] the three read routes and no write route
v1/custom-fields/__tests__/custom-fields.service.spec.ts [now]
v1/custom-fields/__tests__/custom-fields.validator.spec.ts [now]
v1/custom-fields/__tests__/custom-fields.transformer.spec.ts [now]
v1/custom-fields/__tests__/custom-fields.facade.spec.ts [now]
v1/custom-fields/__tests__/custom-field-values.spec.ts [now]
v1/custom-fields/__tests__/custom-fields.repository.spec.ts [now]
v1/custom-fields/__tests__/custom-fields.repository.int.spec.ts [now]
v1/example-item/                         [now] a copy of the template (27 files, BE-22) — never edited by hand; the api half of the backend-module and frontend-feature template pair
v1/example-item/README.md                [now]
v1/example-item/example-item.module.ts   [now]
v1/example-item/example-item.routes.ts   [now] EXAMPLE_ITEM_ROUTES (list, export, record), EXAMPLE_ITEM_PERMISSIONS (the module's own codes), EXAMPLE_ITEM_EXPORT_COLUMNS (every format)
v1/example-item/index.ts                 [now]
v1/example-item/controller/example-item.controller.ts [now] list, export (replyExport, all four formats), get, create, update behind both guards; no delete
v1/example-item/service/example-item.service.ts [now] list, get (ERP-CORE-0004), create and update (one event each), exportCsv: EXAMPLE_ITEM_EXPORT_CELLS through runExport, ticked keys accepted (keys: 'accept') as the request's ids
v1/example-item/service/example-item.validator.ts [now] one keyset sort, the cursor bound to it, q, no filter; parseExportList; strict bodies -> AppError('ERP-VALIDATION-0001')
v1/example-item/service/example-item.enricher.ts [now]
v1/example-item/service/example-item.transformer.ts [now] strips internalRef and ownerStaffId; the id as a string; meta with exportLimit and printLimit
v1/example-item/service/example-item.transport.ts [now]
v1/example-item/repository/example-item.repository.ts [now] bounded in-memory store behind list/count/findById/create/update; an export's ids AND-ed with q and the row scope; the Prisma swap is its doc comment
v1/example-item/model/example-item.model.ts [now] ExampleItemListRequest with the export's optional ids
v1/example-item/dto/example-item.dto.ts  [now] list/export/params schemas (the export fields of export.ts, key included), strict create body and its .partial() update, superset meta + exportLimit and printLimit, EXAMPLE_ITEM_NAME_MAX
v1/example-item/events/published.ts      [now] ExampleItemCreatedV1, ExampleItemUpdatedV1
v1/example-item/events/subscribed.ts     [now]
v1/example-item/facade/example-item.facade.ts [now]
v1/example-item/__tests__/fakes.ts       [now]
v1/example-item/__tests__/create-example-item-test-app.ts [now] StubVerifierModule, TEST_BEARERS
v1/example-item/__tests__/example-item.controller.e2e.spec.ts [now]
v1/example-item/__tests__/example-item.service.spec.ts [now]
v1/example-item/__tests__/example-item.validator.spec.ts [now]
v1/example-item/__tests__/example-item.enricher.spec.ts [now]
v1/example-item/__tests__/example-item.transformer.spec.ts [now]
v1/example-item/__tests__/example-item.transport.spec.ts [now]
v1/example-item/__tests__/example-item.facade.spec.ts [now]
v1/example-item/__tests__/example-item.repository.spec.ts [now] the store: keyset order, walk both ways, own narrows, the bound
v1/example-item/__tests__/route-gates.spec.ts [now] every handler classified; guards and codes per handler
v1/<m>/jobs/                             [reserved: built by the first module that needs it] an optional entry (optionalTop) since shared/queue/ was built; v1/mail built its own (above)
v1/<m>/events/handlers/                  [reserved — built by the first module that needs it] subscribers; v1/auth built the first one (above)
```

`main.ts` is the composition root: Fastify adapter with `TIMINGS.fastify`, `registerRequestId` first, cookie + CSRF plugins from `AUTH_HTTP_SECURITY`, compression, the global prefix minus `UNPREFIXED_ROUTES`, `ProblemDetailsFilter`, fatal handlers — and the one file outside a module that may import a module's `index.ts` (`./v1/auth/index.js`); `shared/` never may (BE-20). `src/__tests__/app.e2e.int.spec.ts` sits in no lint scope by design — a root int spec has nothing to enforce.

The tree is `src/` only. The erp-api files outside it that these rules own are the `@erp/contracts` workspace package: `packages/contracts/package.json` and `tsconfig.json` (it builds to `dist/`, so `src/**` resolves it through node_modules and the root `tsconfig.json` keeps `rootDir: "src"`), `packages/contracts/src/{index,permissions.catalogue,perfex-mapping,route-gates,currency-code}.ts`, the sha256-pinned copy `packages/contracts/src/legacy-rbac.json` and its harness `packages/contracts/__tests__/perfex-mapping.spec.ts`, and `packages/contracts/__tests__/route-gates.spec.ts` (`routeGateIn`: the exact key before an `:id` pattern, the same body as erp-web's mirror) and `packages/contracts/__tests__/currency-code.spec.ts` (the one currency code schema: `CURRENCY_CODE_MAX`, `toCurrencyCode`, `currencyCodeProblem`; erp-web holds its byte mirror, src/config/currency-code.ts in erp-web). `Dockerfile` copies `packages` before the image's `yarn install --immutable`, because the root manifest declares `workspaces: ["packages/*"]`.

`prisma/sql/` holds the DDL of the Node-created tables (`02-coding-rules/07-database.md`): `0004-mail.sql` the three `tblmail_*` tables of `v1/mail`. `assets/fonts/label-font.ttf` is the label font every server PDF that prints names embeds; its `README.md` (family, version, source, sha-256, OFL-1.1, the lead's choice) is the record, and the Dockerfile copies `assets/`.

## Layers

The architecture block, erp-api `configs/eslint/backend.mjs` (spread by erp-api's `eslint.config.mjs`), is sixteen flat-config scopes; a file is in exactly one of 1–14 or 16 (15 is a separate rule and may overlap): **1** v1 default (`src/v1/**/*.ts` minus the next six), **2** transport (`service/*.transport.ts`), **3** repository (`repository/*.repository.ts`), **4** controller (`controller/*.ts`), **5** v1 unit tests (`__tests__/**`, `*.spec.ts`), **6** v1 int specs, **7** shared, **8** `env.schema.ts`, **9** shared specs, **10** root + integrations (minus the email adapter), **11** `integrations.module.ts`, **12** v1 routes (`<m>.routes.ts`, a module's permission map), **13** `@erp/contracts` (`packages/contracts/src/**`), **14** v1 events (`events/*.ts`), **15** `@typescript-eslint/no-magic-numbers` over v1/shared/integrations minus `shared/config/*.ts`, specs and `__tests__`, **16** email adapter (`src/integrations/adapters/email/*.ts`, the one place `nodemailer` may be imported; otherwise scope 10's entries). Entries are constants: `P_NEST_EXCEPTIONS`, `P_HTTP_LIBS`, `P_PRISMA`, `P_NODEMAILER` (appended by `scope()` to every scope but 16, so a scope added later inherits it) (`no-restricted-imports` paths); `G_CROSS_MODULE`, `G_ADAPTERS`, `G_PRISMA`, `G_RESILIENCE`, `G_V1_FROM_SHARED` (patterns); `S_FETCH`, `S_PROCESS_ENV`, `S_TRY`, `S_PERMISSION_LITERAL` and its narrower halves `S_PERMISSION_ARG` and `S_PERMISSION_DECORATOR` (`no-restricted-syntax` selectors). `corepack yarn check:arch` (`scripts/check-architecture-lint.mjs`) writes one probe per scope, asserts every entry fires and every permitted construct stays silent, and proves the scopes disjoint over every `src/**/*.ts`. After the sixteen scopes sit two single-purpose objects that touch no `no-restricted-*` rule and therefore collide with nothing: `HYGIENE` (`src/**/*.ts`: `no-console`, `no-debugger`, the `no-eval` family, `eqeqeq`, `no-var`, `prefer-const`, `no-param-reassign`, described `eslint-disable` directives; `configs/eslint/base.mjs` makes an unused one an error in every linted file) and `TEST_HYGIENE` (`src/**/*.spec.ts`, `src/**/__tests__/**`: `vitest/no-focused-tests`, `no-disabled-tests`, `expect-expect`, `no-identical-title`): BE-10 and BE-24; the same `check:arch` run proves them. The only files in no scope are `src/__tests__/*` (the whole-app int spec and the placement spec), by design.

| Layer | File | May import | Never | Enforced by |
|---|---|---|---|---|
| controller | `controller/<m>.controller.ts` | the service, `dto/`, `<m>.routes.ts`, `shared/http/*` guards and decorators, `TIMINGS` | the transformer, the repository, Prisma, `fetch`, a `try` | `S_TRY`, `S_FETCH`, `P_PRISMA` + `G_PRISMA`, `G_CROSS_MODULE` in scope 4; `src/v1/__tests__/module-shape.spec.ts` (e2e spec required) |
| service | `service/<m>.service.ts` | the other layers, `model/`, `dto/`, `shared/errors`, `shared/config`, `shared/logger` | Prisma, `fetch`, `shared/resilience`, Nest exceptions, `process.env` | `P_PRISMA` + `G_PRISMA`, `S_FETCH`, `G_RESILIENCE`, `P_NEST_EXCEPTIONS`, `S_PROCESS_ENV` in scope 1 |
| validator | `service/<m>.validator.ts` | `dto/` schemas, `model/`, `shared/errors` | Nest exceptions, I/O | `P_NEST_EXCEPTIONS` in scope 1; `src/v1/auth/__tests__/auth.validator.spec.ts` form |
| enricher | `service/<m>.enricher.ts` | `model/`, the transport (for lookups) | Prisma, `fetch`, another module's facade directly | `P_PRISMA`, `S_FETCH`, `G_CROSS_MODULE` in scope 1 |
| transformer | `service/<m>.transformer.ts` | `model/`, `dto/` schemas | I/O of any kind | scope 1 (same entries as the service) |
| transport | `service/<m>.transport.ts` | `shared/resilience/*`, the event port, `integrations/ports`, another module's `index.js`, `fetch` | Prisma, HTTP libraries, adapters, `process.env` | `P_PRISMA` + `G_PRISMA`, `P_HTTP_LIBS`, `G_ADAPTERS`, `S_PROCESS_ENV` in scope 2 (no `G_RESILIENCE`, no `S_FETCH` — the permitted file) |
| repository | `repository/<m>.repository.ts` | `PrismaService`, `@prisma/client`, `model/`, `dto/` row schemas | `fetch`, `shared/resilience`, HTTP libraries | `S_FETCH`, `G_RESILIENCE`, `P_HTTP_LIBS`, `G_CROSS_MODULE` in scope 3 (no `P_PRISMA`/`G_PRISMA` — the permitted file) |
| facade | `facade/<m>.facade.ts` | the service, `model/` public types, a `shared/http/auth` port to implement | the repository, Prisma | scope 1; `src/v1/auth/__tests__/auth.facade.spec.ts` form (resolves through the module) |
| model | `model/<m>.model.ts` | nothing outside `shared/` types | Prisma types re-exported | scope 1 |
| dto | `dto/<m>.dto.ts` | `zod` | Prisma, `model/` internals it would leak | scope 1; `@typescript-eslint/no-magic-numbers` (scope 15) for limits |
| events | `events/published.ts`, `events/subscribed.ts` | `shared/events/domain-event.js` | anything else | `src/v1/__tests__/module-shape.spec.ts` (both files required; catalog equals README) |
| routes | `<m>.routes.ts` | `shared/http/api-prefix.js` | — | scope 1 |
| module | `<m>.module.ts` | every layer, `shared/*` modules | `@Global()` (auth excepted) | `src/v1/__tests__/module-shape.spec.ts` (`@Global()` clause, registration clause) |
| index | `index.ts` | the facade and public types | a layer file | `G_CROSS_MODULE` in scopes 1–6 (consumers may reach only `index.js`) |
| README | `README.md` | — | — | `src/v1/__tests__/module-shape.spec.ts` (ten headings, three Resilience bullets, events table) |
| `__tests__` | `fakes.ts`, `create-<m>-test-app.ts`, `*.spec.ts`, `*.int.spec.ts` | the module, `fetch` in a fake, `shared/resilience` in a transport spec | Prisma (unit specs), adapters, another module's internals | scope 5 (`P_PRISMA` + `G_PRISMA`, `G_CROSS_MODULE`, `G_ADAPTERS`, `S_PROCESS_ENV`); scope 6 for int specs (Prisma and `process.env.DATABASE_URL` permitted) |

`fetch` is banned in scopes 1, 3, 4, 12, 14 and permitted in 2, 5, 6; Prisma is banned in 1, 2, 4, 5, 12, 14 and permitted in 3, 6; `process.env` is banned in every scope but 6, 8 and 9; a permission name is banned everywhere but its two homes 12 and 13 — in 5, 6 and 14 only in the `@Permissions`/`hasPermission` argument form, and in 9 not at all, because the guard's own spec constructs codes literally and an event name has the same grammar; `/v1/` is banned in 7–9 and 13; `**/adapters/**` everywhere but 11.

## Rules

### BE-01 A module is `src/v1/<m>/` with exactly the allowed entries; optional service layers are present when the module has that concern

- **Rule:** A module is the folder `src/v1/<m>/` holding exactly `<m>.module.ts`, `<m>.routes.ts`, `index.ts`, `README.md`, `controller/`, `service/`, `repository/`, `model/`, `dto/`, `events/` (`published.ts` + `subscribed.ts`, optionally `handlers/`), `facade/` and `__tests__/`; inside `service/`, `<m>.service.ts` is required and `<m>.validator.ts` (request body or query), `<m>.enricher.ts` (computed fields), `<m>.transformer.ts` (response DTO) and `<m>.transport.ts` (outbound call) are present when the module has that concern; any other `service/` file is listed in the README `## Layers` table. One named exception (lead 2026-10-02): `v1/settings`, listed in `FACADE_ONLY_MODULES`, is a read-only facade with no HTTP surface and holds exactly `settings.module.ts`, `index.ts`, `README.md`, `service/`, `repository/`, `model/`, `facade/` and `__tests__/`: no `settings.routes.ts`, `controller/`, `dto/` or `events/`, so no controller e2e spec (BE-21) and no events files (BE-05: its Endpoints and both Events sections say None); the exception is by name, so any other module without a controller still fails. A second named exception (lead 2026-10-04): a module with no tables has no `repository/` folder; `TABLELESS_MODULES` names them (`v1/branding`, which reads every row through `SettingsFacade` and `CurrenciesFacade`); the exception is by name, so any other module without a `repository/` still fails.
- **Where:** erp-api `src/v1/`.
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` (top-level set equals the allowed set, `events/` files, `service/` file names or a backticked `service/<file>` row in `## Layers`); new modules start as a copy of the template `05-templates/backend-module/`. `FACADE_ONLY_MODULES` in `src/v1/__tests__/module-shape.spec.ts` admits that shape for `settings` only, and its `topLevelProblems` cases fail the same shape under another name and `settings` with a `controller/`. `TABLELESS_MODULES` in `src/v1/__tests__/module-shape.spec.ts`: `allowedTop` drops `repository` for a listed module, so a `repository/` there is an extra entry, and its cases fail the same entries under another name; a listed module's README `## Owned tables` says None and no non-test file of it names `PrismaService`.
- **Instead:** Copy `src/v1/example-item/` of `05-templates/backend-module/` into `src/v1/<name>/` and rename the four spellings (BE-22), register it in `src/v1/v1.module.ts`, fill in logic layer by layer; `v1/auth` is the reference (every layer), `v1/branding` the smallest complete module (no validator, enricher or repository; its transport reaches the settings and currencies facades); `v1/settings` is the facade-only form to copy if the lead ever names a second one.
- **Why:** freshers fill structure, never design it; `03-architecture/03-backend-components.md`.

### BE-02 `shared/` and `integrations/` are unversioned; `v2/<m>/` exists only for an incompatible contract change

- **Rule:** Keep `src/shared/` and `src/integrations/` outside any version folder, add a `src/shared/` folder only from the reserved list with its README row and the spec allowlist in the same PR, and create `v2/<m>/` under `src/` only when that module's public contract (routes, DTOs, facade) changes incompatibly.
- **Where:** erp-api `src/`.
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` (`SHARED_ALLOWLIST` = cache, config, crypto, db, errors, events, health, http, logger, queue, resilience, storage, uploads (queue, storage and uploads arrived with their README rows); `SHARED_RESERVED` = validation, base, timers, utils; `README.md` the only root file); `G_V1_FROM_SHARED` (`no-restricted-imports`, regex `/v1/`) in scopes 7–9 keeps `shared/` version-free; a PR that adds a `v2/` folder names the contract change in its description (review, in addition).
- **Instead:** A compatible change (new optional field, new endpoint) stays in `v1/`; an incompatible one copies the module to `v2/`, registers it under `/api/v2`, and leaves `v1/` serving until its consumers move.
- **Why:** `03-architecture/03-backend-components.md` shared-layer table.

### BE-03 Reach another module only through its `index.ts` (the facade) or through events

- **Rule:** Import another module only through `src/v1/<other>/index.js` (which exports the facade and public types) or react to it through an event; never import its `controller/`, `service/`, `repository/`, `model/`, `dto/`, `events/` or `facade/` files directly.
- **Where:** erp-api `src/v1/**`.
- **Enforced by:** `G_CROSS_MODULE` (`no-restricted-imports`, regex `^(\.\./)+(?!shared/|integrations/)[a-z0-9-]+/(controller|service|repository|model|dto|events|facade)/`, message "import another module through its index.js only (BE-03)") in scopes 1–6 — `shared/` and `integrations/` are excluded by the lookahead because they are not modules; `corepack yarn check:arch` proves it fires in every scope.
- **Instead:** Add a method to the owner's facade (with a batch variant when it takes ids) or subscribe to the owner's event in `events/subscribed.ts` + `events/handlers/`; if the owner's facade lacks what you need, the owner's module changes, not yours. Call the facade from the transport, the layer that leaves the module.
- **Why:** extraction is atomic only when the facade is the whole surface.

### BE-04 Write only the tables the ownership register gives to `node`, and only from `repository/`

- **Rule:** A module writes only the tables the ownership register assigns to `node` and only the columns its README `## Owned tables` names; to record a fact about another module's entity it keeps its own record and publishes an event, or calls the owning module's facade with the business reason under "Why synchronous" in its README.
- **Where:** erp-api `src/v1/<m>/repository/` (the only Prisma callers, DB-04) and `src/shared/db/`.
- **Enforced by:** the Prisma ownership guard `src/shared/db/ownership-guard.ts` (`src/shared/db/__tests__/ownership-guard.spec.ts`, `src/shared/db/__tests__/ownership-guard.int.spec.ts`: every write verb on a table whose owner is not `node` is rejected outside production, and so is a non-SELECT `$queryRaw*`; an `$executeRaw*` is admitted only when **every** table it writes is `node`-owned: the target tables are parsed out of the statement by a deliberately narrow, fail-closed parser, so an unparseable, multi-statement or qualified target is refused, which is what lets a module write a table Prisma `@@ignore`s for having no primary key, DB-03). The owner comes from the **union of both registers** (`src/shared/db/ownership.ts`, `src/shared/db/__tests__/ownership.spec.ts`): the generated legacy register and `ownership-node.json` for tables the new system created; a table in both fails the load; and the co-write register `prisma/ownership-cowrites.json` (`ownership-cowrites.spec.ts`), whose records alone admit a write into a table another owner holds; `src/v1/__tests__/module-shape.spec.ts` requires the README `## Owned tables` heading. `v1/departments` only reads Perfex-owned `tbldepartments`, six of its fourteen columns; its `src/v1/departments/__tests__/department-columns.spec.ts` fails when anything writes the table, when any `tbldepartments` call that returns rows lacks the one allow-list `DEPARTMENT_COLUMNS`, when any file names one of the eight mailbox columns, or when any file but its repository names the table.
- **Instead:** Own table + event by default; a synchronous facade call to the owner when both writes must happen or neither. Column-level scope is legitimate when written down: `v1/auth` writes only `password`, `last_login`, `last_ip` of `tblstaff` (`src/v1/auth/README.md`).
- **Why:** one writer module; `03-architecture/05-strangler-fig-migration.md` ownership register.

### BE-05 Every module README carries the ten sections in order, the three Resilience bullets, and an Events published table equal to `events/published.ts`

- **Rule:** `src/v1/<m>/README.md` has, in this relative order, `## Purpose`, `## Owned tables`, `## Facade surface`, `## Endpoints`, `## Events published`, `## Events subscribed`, `## Jobs`, `## Resilience` (bullets `- **Breaker:**`, `- **Retry policy:**`, `- **Pool budget:**`), `## Layers` and `## How to run its tests`; `## Events published` is a table whose first column lists exactly the `static readonly NAME` values in `events/published.ts`, or starts with `None` when both are empty; optional sections (`## Redis keys`, `## Security notes`, `## Legacy parity`) may sit between them.
- **Where:** erp-api `src/v1/<m>/README.md`.
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` (headings in relative order, bullet prefixes, table names equal to the `NAME` constants); the template is `05-templates/backend-module/src/v1/example-item/README.md` (copied with the module).
- **Instead:** Start from the template's README; keep `events/published.ts` and the table in the same commit — a class without a row, or a row without a class, fails the spec. `src/v1/auth/README.md` is the filled example.
- **Why:** the README lists events published and subscribed; the README carries the Resilience line.

### BE-06 `process.env` is read only in `src/shared/config/env.schema.ts`

- **Rule:** Read `process.env` in exactly one application file, `src/shared/config/env.schema.ts`, declare every variable there with zod (cross-field rules in `superRefine`) so the process fails at boot, and read values through the injected `AppConfig`; an int spec may read `process.env.DATABASE_URL` to skip itself.
- **Where:** erp-api `src/**`.
- **Enforced by:** `S_PROCESS_ENV` (`no-restricted-syntax`, selector `MemberExpression[object.name="process"][property.name="env"]`, message "process.env only in shared/config/env.schema.ts (BE-06)") in scopes 1–5, 7, 10, 11 and 16; off in scope 6 (v1 int specs), 8 (`env.schema.ts` itself) and 9 (shared specs); `src/shared/config/__tests__/env.schema.spec.ts` proves the refinements; `corepack yarn check:arch` proves scope 8 has the rule off and the others fire.
- **Instead:** Inject `AppConfig` (`src/shared/config/app-config.ts`) and read the typed field; add a new variable to the schema first with a comment saying what it controls; values come from `../erp-infra/env/<env>/api.env`, never from a file in this repo. Durations and thresholds are not env variables (BE-11).
- **Why:** env and secrets in erp-infra only; `03-architecture/03-backend-components.md`.

### BE-07 `/health` answers on both paths from one controller; a probe is registered, never wired into it; breakers never degrade `status`

- **Rule:** `GET /health` (container healthcheck) and `GET /api/v1/health` (through Nginx) return `{ status: 'ok' | 'degraded', checks }` from the one `HealthController` mounted on `HEALTH_ROUTES` (200, or 503 with the same body shape); a module adds a probe with `HealthService.register(name, check)` from its module's `onModuleInit`, probe budgets are `TIMINGS.health.probeTimeoutMs` and `TIMINGS.health.dependencyTimeoutMs`, and breaker states ride along as `checks.breakers.<name>` (the state word only) without affecting `status`.
- **Where:** erp-api `src/shared/health/`, `src/shared/http/api-prefix.ts`; any module that owns a dependency worth probing (`db` and `redis` today).
- **Enforced by:** `src/shared/health/__tests__/health.controller.spec.ts` (both paths 200 when every check is ok, 503 with the same body shape when one fails) and `src/shared/health/__tests__/health.service.spec.ts` (budgets, breaker states never degrade `status`) in `corepack yarn test`; `src/shared/health/health.types.ts` (`tsc`: a probe result is `'ok' | 'error'`, never a message).
- **Instead:** In the module that owns the dependency, call `healthService.register('db', () => ...)` from `onModuleInit`; `checks.<name>` appears without any change to `HealthController`.
- **Why:** an open breaker is the upstream's outage, not ours; `03-architecture/05-strangler-fig-migration.md` (Nginx probes the migrated side).

### BE-08 Each layer does its one duty: the controller calls the service, the service orchestrates and returns the DTO, the validator parses, the enricher is pure, the transformer builds field by field, the transport is the only file that leaves the process, the repository is the only Prisma caller

- **Rule:** A controller handler makes one service call, touches only cookies and headers via `reply`, never catches and returns the service's DTO; the service is a plain `@Injectable()` that orchestrates validator → repository → enricher → transformer (it calls the transformer — the controller never imports one), keeps an injectable `now`, and does no I/O of its own; the validator runs `schema.safeParse` and throws `AppError('ERP-VALIDATION-0001', detail, { issues })`, and returns a reason value or throws `AppError` for a business refusal; the enricher is pure; the transformer builds the DTO field by field, then `schema.parse`s it so nothing internal leaks; the transport is the only file that calls `fetch`, a breaker, another module's facade or the event port; the repository is the only Prisma importer, selects named columns, and uses `$queryRaw` + a zod row schema for a table without a primary key; the facade is thin; and a read that two permission codes may open declares `@PermissionsAny(view, viewOwn)` widest-code-first, so `PermissionGuard` — not the handler — resolves the row scope `all | own` from the code that admitted the caller, `@Scope()` hands it to the controller, the service carries it with the actor's staff id without re-deciding it, and only the repository filters rows by it, where `own` may narrow and never widen; and every permission name in that declaration comes from `@erp/contracts` — `packages/contracts/src/permissions.catalogue.ts` is the one home of a clean `module.resource.action` name, `packages/contracts/src/perfex-mapping.ts` the only file in either repository that may carry a legacy Perfex code, the enricher is the only place a Perfex code is translated, and a permission string literal anywhere but a module's own `<m>.routes.ts` map is a lint error; the write direction back to Perfex (`toPerfexPermission` / `PERFEX_BY_CLEAN`, which `v1/identity` needs because it writes Perfex-format rows) is **derived in code from the same forward table**, never a second hand-written one, so the two can never drift; and the permission snapshot is **rebuilt on every token refresh**, never reused from cache, so a permission revoked in Perfex stops working in Node within one access-token lifetime.
- **Where:** erp-api `src/v1/<m>/controller/`, `service/`, `repository/`, `facade/`, `src/shared/http/guards/permission.guard.ts`, `src/shared/http/decorators/scope.decorator.ts`, `packages/contracts/src/**`.
- **Enforced by:** `S_TRY` (`no-restricted-syntax` `TryStatement`, message "controllers never catch; ProblemDetailsFilter answers (BE-08)") in scope 4; `S_FETCH` + `G_RESILIENCE` banned in scopes 1, 3, 4 and permitted only in scope 2 (transport); `P_PRISMA` + `G_PRISMA` banned in scopes 1, 2, 4, 5 and permitted only in scopes 3 (repository) and 6 (int specs); `P_NEST_EXCEPTIONS` in scopes 1–4; `src/v1/__tests__/module-shape.spec.ts` requires one spec per layer present; `corepack yarn check:arch` proves each scope fires. "The controller never imports the transformer" has no lint entry: `src/v1/branding/controller/branding.controller.ts` is the form to copy (review, in addition). The row scope is pinned by `src/shared/http/guards/__tests__/permission.guard.spec.ts` (either code admits, the code that admitted decides `all` or `own`, an all-of list beside the any-of form is still required, an admin needs no branch), `src/shared/http/__tests__/scope.decorator.spec.ts` (`scopeFrom` only reads what the guard wrote; no user is ERP-AUTH-0004) and `src/v1/example-item/__tests__/example-item.repository.spec.ts` (the template's store: `own` never returns another member's row in `list`, `count` or `findById`), plus the `<m>.repository.int.spec.ts` module-shape requires once a repository reads `this.prisma`, which proves it against the real database. The permission names are pinned by `S_PERMISSION_LITERAL` (`no-restricted-syntax`) in scopes 1–4, 7, 10 and 11 with its argument half in 5, 6 and 14 — the two homes are scope 12 (`<m>.routes.ts`) and scope 13 (`packages/contracts/src/**`), proven by one positive and two negative `corepack yarn check:arch` probes — by `corepack yarn test packages/contracts` (`packages/contracts/__tests__/perfex-mapping.spec.ts`: the mapping is one-to-one, covers its declared number of active Perfex codes — `EXPECTED_MAPPED_CODES`, asserted against the pinned register's own count and against the distinct active pairs, so a missed or duplicated code fails the suite — closes over the catalogue, matches the clean-name grammar, and round-trips: `toPerfexPermission(toCleanPermission(code))` is the identity for every mapped code). The one translation point and the refresh rebuild are pinned by `src/v1/auth/__tests__/auth.enricher.spec.ts` (a Perfex row with no mapping entry is dropped and counted in one `warn` that carries no code, never passed through), `src/v1/auth/__tests__/auth.service.spec.ts` (two refreshes cause two repository reads, and a permission removed between them is gone from the second snapshot) and `src/v1/auth/__tests__/auth.controller.e2e.spec.ts` (`GET /api/v1/auth/me` returns the exact clean-name array).
- **Instead:** Copy the layer from `v1/auth` (`src/v1/auth/service/auth.service.ts` for orchestration and `now`, `src/v1/auth/service/auth.validator.ts` for `parseLoginRequest` / `refusalReason`, `src/v1/auth/repository/auth.repository.ts` for named-column `select`, compare-and-set `updateMany` and `$queryRaw` + a zod row schema). A second implementation of a port (Redis, vendor) lives beside the port in `repository/` and passes the same contract spec (`src/v1/auth/repository/auth-session.store.ts` and its two implementations). Extra single-concern classes may live in `service/` (`lockout-policy.ts`, `password-hasher.ts`, `token-issuer.ts`), listed in the README `## Layers`. Transactions are `prisma.$transaction` inside the repository — no `@Transactional`, base class or `Result` type exists, and none is planned until a second module needs one. A scoped read is copied whole from the template's skeleton: `src/v1/example-item/controller/example-item.controller.ts` (the decorators), `src/v1/example-item/service/example-item.service.ts` (the pass-through) and `src/v1/example-item/repository/example-item.repository.ts` (the `own` narrowing, and the docblock that shows the Prisma `where` and says `own` never widens) — every module copied from the template inherits it.
- **Why:** a read guard admits `view` or `viewOwn` and passes `all | own` to the repository, which filters rows by it; one clean catalogue, one translation point; `01-onboarding/02-first-feature.md` §3 (the layers file by file).

### BE-09 Throw `AppError(code)` from the catalog; the filter answers RFC 9457; controllers never catch

- **Rule:** Every failure is `new AppError(code, detail?, extras?)` with `code` from `ERROR_CODES` in `src/shared/errors/error-codes.ts` (`ERP-<AREA>-<NNNN>`: `VALIDATION`, `AUTH`, `CORE`, `UPSTREAM`, `INTERNAL`, `IDENTITY`, `EXPENSECATEGORIES`, `TAXES`, `COSTCENTERS`, `PAYMENTMODES`, `CURRENCIES`, `MAIL`, `FILES` today; a module adds its codes with the first throw; a module's area is its kebab name upper-cased with the hyphens removed (`ERP-EXPENSECATEGORIES-0001`), and an administrator-only refusal answers the shared `ERP-AUTH-0005`, never a per-module 403; `ERP-CORE-0004` (404) is the one not-found code a module copied from the template answers: a missing row and a row the caller's scope hides get the same body, so an id reveals nothing); `ProblemDetailsFilter` emits `application/problem+json` `{ type: 'about:blank', status, title, detail, code, issues? }` with `Retry-After` from `extras.retryAfterS`; an unknown error becomes `ERP-INTERNAL-0001` with the fixed detail `Internal error` (the original goes to the logger only); no Nest `HttpException` subclass is thrown in `v1/`; controllers never catch; the fatal handlers (`unhandledRejection`, `uncaughtException` -> log, exit 1) and `enableShutdownHooks()` live in `src/main.ts`.
- **Where:** erp-api `src/shared/errors/`, `src/v1/**`, `src/main.ts`.
- **Enforced by:** `tsc` (`ErrorCode` union — an unknown code does not compile); `src/shared/errors/__tests__/problem-details.filter.spec.ts`; `P_NEST_EXCEPTIONS` (`no-restricted-imports` `importNames` = `NEST_HTTP_EXCEPTIONS`, the nine `HttpException` classes of `@nestjs/common`, message "throw AppError(code) — 02-coding-rules/05-backend.md BE-09") in scopes 1–4; `S_TRY` in scope 4. A Prisma error mapper (`shared/errors/prisma-error.mapper.ts`, unique constraint → 409, not found → 404) is built by the first module that needs it — the first write to a table with a unique constraint — and its cases join `src/shared/errors/__tests__/problem-details.filter.spec.ts`; until then no repository catches a Prisma error and `tsc` rejects a code that is not in the catalog.
- **Instead:** `throw new AppError('ERP-AUTH-0006', undefined, { retryAfterS })` in the service or validator; a subclass only when behaviour differs (`src/shared/errors/upstream-unavailable.error.ts` is the one example); an expected refusal is a returned reason value (`refusalReason(): LoginRefusalReason | null`) — there is no `Result` type; `UpstreamUnavailableError` is never caught to hide an outage.
- **Why:** generic titles never leak which check failed.

### BE-10 One `LoggerService` to stdout with `redact()` on every line; `requestId` and `staffId` come from the request context

- **Rule:** Log through the one winston `LoggerService` (`src/shared/logger/logger.service.ts`): Console transport only, JSON lines everywhere except development (`format === 'pretty'`); level `info` in production, `debug` elsewhere; `write()` merges `{ requestId, staffId? }` from `src/shared/logger/request-context.ts` before `redact()` (an explicit meta key wins), so every line correlates with the `x-request-id` response header; `src/shared/logger/redact.ts` (`REDACT_KEYS` — password, authorization, cookie, refresh, token, secret, pem, x-csrf-token and their variants — plus bearer masking) is THE redaction list: extend it, never add a second sanitiser; per layer, the service logs business events at `info`/`warn`, the transport logs outbound status, retries and breaker transitions, and the repository logs a slow query once `TIMINGS.db.slowQueryMs` and Prisma event logging exist — built by the first module that needs it, with a case in `src/shared/logger/__tests__/logger.service.spec.ts`; until then `TIMINGS.db` has no such key and `tsc` rejects a reference to it.
- **Where:** erp-api `src/shared/logger/`, `src/shared/http/request-id.ts`, every layer that logs.
- **Enforced by:** `no-console` (`error`, the `HYGIENE` object at the end of the architecture block in `configs/eslint/backend.mjs`, files `src/**/*.ts`, no ignores — `console.*` is a lint error everywhere in `src/`, specs included; the only output is `LoggerService`, whose `pretty` format is the development mode; `corepack yarn check:arch` proves it fires and that a `LoggerService` call is silent); `src/shared/logger/__tests__/redact.spec.ts`, `src/shared/logger/__tests__/logger.service.spec.ts` (format per `NODE_ENV`, context merged before redaction, one transport), `src/shared/logger/__tests__/request-context.spec.ts`, `src/shared/http/__tests__/request-id.spec.ts` (mint or echo; only `^[A-Za-z0-9._-]{1,64}$` is echoed).
- **Instead:** `this.logger.warn('auth.refresh.reuse', { staffId, family })` — a dotted event name and ids/labels only; never a hash, token or body. Rotation and shipping are erp-infra's (Docker captures stdout); a readable development format is a winston format on the same transport, never a second one. `main.ts` builds one `LoggerService` directly because the fatal handlers must exist before the Nest container does.
- **Why:** `03-architecture/03-backend-components.md`; the monitoring stack is not decided yet — the api does not pick a shipper.

### BE-11 Every duration and threshold lives in `TIMINGS`; config is `AppConfig`; env carries deployment-varying values only

- **Rule:** Put every duration, TTL, threshold and budget in `src/shared/config/timings.ts` (`TIMINGS`, frozen, one group per concern: `auth`, `branding`, `breaker`, `db`, `redis`, `http`, `health`, `fastify`, `uploads`, `idempotency`, `queue`, `mail` today), retry shapes in `retry-policies.ts` (`RETRY_POLICIES`, `mailSend` the per-processor policy of `mail.send`), pool sizes in `pool.ts` (`POOL`, `smtp` the nodemailer pool per worker replica), compression in `http.ts` (`HTTP`); read configuration through the injected `AppConfig` (`src/shared/config/app-config.ts`), never a Nest `ConfigService`; env holds deployment-varying values only (URLs, secrets, `connection_limit` in `DATABASE_URL`, `API_DOCS_ENABLED` (BE-23; default `true` outside production, `false` in it), and the two non-production `RESILIENCE_BREAKER_*` knobs as the deliberate exceptions); feature flags are `shared/config/flags.ts` (naming rule `erp/flag-naming`, `02-coding-rules/01-typescript-and-lint.md` TS-14), built by the first module that needs a flag with `env.schema.spec.ts` cases for its variables; until then no flag exists.
- **Where:** erp-api `src/shared/config/`, every file that would otherwise write a number.
- **Enforced by:** `@typescript-eslint/no-magic-numbers` (scope 15; `ignore: [-1, 0, 1, 2]`, `enforceConst`, `detectObjects: false`) — an inline literal such as `setTimeout(fn, 5000)` is an error; a `const` declaration is exempt, so "this constant belongs in `TIMINGS`, not in the module" is review in addition; `src/shared/config/__tests__/timings.spec.ts`, `src/shared/config/__tests__/env.schema.spec.ts`; `corepack yarn check:db` in erp-api asserts the rendered `DATABASE_URL` carries `connection_limit`.
- **Instead:** Add a key to the module's `TIMINGS` group (`TIMINGS.branding.cacheMs`) with a one-line comment; a pure policy function reads it (`src/v1/auth/service/lockout-policy.ts`). A non-duration literal a schema needs is a named module constant (`EMAIL_MAX_LENGTH` in `src/v1/auth/dto/auth.dto.ts`, `EXAMPLE_ITEM_NAME_MAX` in `src/v1/example-item/dto/example-item.dto.ts`).
- **Why:** `03-architecture/03-backend-components.md`.

### BE-12 Cache through `RedisService` on db 0; a private memo only for a value the module owns; Redis databases are cache 0, auth 1, queues 2

- **Rule:** The shared cache client is `RedisService` (`src/shared/cache/redis.service.ts`) on the database in `REDIS_URL` (`/0`) with the fail-fast options from `TIMINGS.redis`; a module may keep one private in-process memo only for a value it owns, refreshed per `TIMINGS.<m>.*` (`versionCache` / `TIMINGS.auth.versionCacheMs` in `src/v1/auth/service/auth.service.ts` and `memo` / `TIMINGS.branding.cacheMs` in `src/v1/branding/service/branding.service.ts` are the two examples); the tiered cache — `@Cacheable({ tier, ttl, key })`, L1 `shared/cache/local-cache.service.ts`, L2 on Redis, keys `erp:{env}:{module}:{entity}:{id}:v{n}`, invalidation by domain event with pub/sub fan-out — is built by the first module that needs a cache tier, with `shared/cache/cacheable.spec.ts` arriving alongside; Redis logical databases are cache 0, auth 1, queues 2, and no two purposes share a database.
- **Where:** erp-api `src/shared/cache/`, `src/v1/<m>/service/<m>.service.ts`.
- **Enforced by:** `src/shared/cache/__tests__/redis.service.spec.ts` (options, probe); `src/v1/auth/__tests__/auth-session.store.int.spec.ts` (auth on db 1 on the wire, so the cache client cannot share it); `@typescript-eslint/no-magic-numbers` (scope 15) makes an inline TTL literal an error; absence of an ad-hoc tier: the `SHARED_ALLOWLIST` in `src/v1/__tests__/module-shape.spec.ts` rejects a new `src/shared/` folder, and a memo outside the two forms above is review in addition.
- **Instead:** `private memo: { value: Branding; expiresAt: number } | null` refreshed when `this.now() > expiresAt`; a value another module owns is never memoised locally — ask its facade (BE-03). The ioredis URL path overrides `{ db }`, so a client for another database rewrites the URL like `authDatabaseUrl()` in `src/shared/db/database-url.ts`.

### BE-13 Events are past-tense classes in `events/published.ts`, published from the transport through the port, and equal to the README table

- **Rule:** A module declares every event it emits in `events/published.ts` as a past-tense class extending `DomainEvent` (`src/shared/events/domain-event.ts`) with `static readonly NAME = '<module>.<entity>.<verb-ed>'` (versioned in the class name, `StaffLoginSucceededV1`), listed in `<M>_PUBLISHED_EVENTS`; `events/subscribed.ts` lists what it handles (handlers under `events/handlers/`); payloads carry ids and labels, never a hash, token or body; publishing goes through `DOMAIN_EVENT_PUBLISHER` from the transport (`publish()` in `src/v1/auth/service/auth.transport.ts`) and a subscriber registers on `DOMAIN_EVENT_SUBSCRIBER` from its handler's `onModuleInit`, never by importing the publisher's module; delivery is in-process (`RecordingDomainEventPublisher` fans out to the handlers of the event's name after the writing transaction has committed, and contains a handler's rejection so a notification's reader cannot fail the request that made the change); the transactional outbox (`eventId`, `requestId`, `actorId` added at write, then the relay) rebinds both tokens — built by the first module that needs delivery **beyond this process** (a job, or a second api instance), with `shared/events/outbox.int.spec.ts` arriving alongside. A cross-module subscriber on its own no longer triggers it: `v1/auth` is one and the in-process bus serves it.
- **Where:** erp-api `src/v1/<m>/events/`, `src/shared/events/`.
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` (both files required; `## Events published` table equals the `NAME` constants; `events/` holds nothing but `published.ts`, `subscribed.ts`, `handlers/`); `src/shared/events/__tests__/domain-event.publisher.spec.ts`; `src/v1/auth/__tests__/auth.service.spec.ts` (the events a login publishes are asserted by name); `src/v1/auth/__tests__/identity-access.handler.spec.ts` (the four subscriptions, a payload with no `staffId` dropped, a failing handler contained) and `src/__tests__/app.e2e.int.spec.ts` (publishing `identity.permissions.replaced` drops `auth:perm:{staffId}` in the real Redis); absence of an out-of-process path today: `SHARED_ALLOWLIST` and the `jobs/` clause of the same spec.
- **Instead:** `StaffLoginSucceededV1 extends DomainEvent<'auth.login.succeeded', { staffId, sessionId, at }>` with `static readonly NAME = 'auth.login.succeeded'`, a README row whose first cell is the backticked name (`` | `auth.login.succeeded` | `StaffLoginSucceededV1` | `{ staffId, sessionId, at }` | ``), and `this.transport.publish(new StaffLoginSucceededV1(payload))` from the service. To subscribe, copy `src/v1/auth/events/handlers/identity-access.handler.ts`: the names are `as const` strings in your own `events/subscribed.ts` (the one scope that admits the three-segment dotted grammar) and the payload is parsed with zod — never import the publisher's `events/` (BE-03).

### BE-14 Jobs live in `v1/<m>/jobs/` on a BullMQ queue in Redis db 2 with a DLQ per queue, run by the worker process

- **Rule:** When a module needs background work it adds `jobs/<name>.job.ts` (the zod data schema, ids only, and an enqueue helper calling `QueueService.add`) and `jobs/<name>.processor.ts` (extends `BaseProcessor`, idempotent), one queue per consumer concern, attempts and backoff from `RETRY_POLICIES.queueJob` or the processor's own `retryPolicy`, `NonRetryableJobError` for a failure no retry can fix and `DeferJobError(delayMs)` to wait without spending an attempt, a dead-letter queue `<queue>.dlq` per queue replayed by `replayDeadLetters`, all on Redis db 2 (`QUEUE_REDIS_DB`) under the `bull` prefix (repeatable schedulers too); the api only enqueues (`QueueModule.forRoot({ runWorkers: false })`) and the worker entry `src/worker.ts` (`WorkerModule`, an application context with no HTTP listener, `DB_POOL_ROLE=worker` so `POOL.db.worker`) runs every registered processor.
- **Where:** erp-api `src/v1/<m>/jobs/`, `src/shared/queue/` (`queue.module.ts`, `queue.service.ts`, `base.processor.ts`, `queue-connection.ts`), `src/worker.ts` and `src/worker.module.ts`; `src/shared/uploads/uploads-cleanup.processor.ts` (the hourly `uploads.cleanup`) was the first processor. `v1/mail` was the first module with `jobs/`: `mail.send` (`MailSendProcessor` sets its own `retryPolicy = RETRY_POLICIES.mailSend` and throws `DeferJobError` while the `email` breaker is open, spending no attempt), `mail.sweep` (every 5 minutes, re-adds a row queued without a job) and `mail.purge` (daily, the 12-month log purge), consumed by the worker and enqueued by the api; `src/v1/mail/__tests__/mail-worker.int.spec.ts` proves the worker registers the three.
- **Enforced by:** `src/shared/queue/__tests__/queue.int.spec.ts` (db 2 on the wire: retries then the DLQ, deferral without an attempt, no `bull:` key left), `src/shared/queue/__tests__/queue.service.spec.ts`, `src/__tests__/worker.int.spec.ts` (the worker boots without HTTP and registers `uploads.cleanup`), `src/v1/mail/__tests__/mail-worker.int.spec.ts`; `src/v1/__tests__/module-shape.spec.ts` (`jobs` is the one `optionalTop` entry, `SHARED_ALLOWLIST` holds `queue`, `## Jobs` is a required heading); `src/shared/config/__tests__/env.schema.spec.ts` (`QUEUE_REDIS_DB` defaults to 2 and is refused when it equals the auth or cache database).
- **Instead:** Copy `src/v1/mail/jobs/mail-send.job.ts` and `mail-send.processor.ts` (the processor in the module's providers, its constructor taking `ProcessorRegistry` first); list each queue in the README `## Jobs` table. Work that needs no background run publishes a domain event instead (BE-13).

### BE-15 A POST that creates or moves money, stock or documents carries `Idempotency-Key`; login is the counter-example

- **Rule:** Every `POST` that creates a resource or moves money, stock or a document requires the `Idempotency-Key` header (any 16 to 128 character token of `[A-Za-z0-9_-]`; erp-web mints `crypto.randomUUID()` when the form opens or the file is chosen), answers `400 ERP-CORE-0010` without it, `409 ERP-CORE-0011` while the first request is in progress, `422 ERP-CORE-0012` when the key is reused with a different fingerprint (method, URL, body), and replays the stored status and body with `Idempotent-Replayed: true`; an unreachable store is `503 ERP-UPSTREAM-0001` before the handler runs; the four layers are interceptor, persistence unique keys, async `eventId`, provider ids; login, refresh and logout are never keyed and never retried.
- **Where:** erp-api `src/shared/http/interceptors/` (`IdempotencyInterceptor`, `@Idempotent()`, the store on Redis db 0 with `TIMINGS.idempotency`), `src/shared/errors/error-codes.ts`, every keyed controller (`v1/mail`'s sends).
- **Enforced by:** `src/shared/http/interceptors/__tests__/idempotency.interceptor.spec.ts` (every row of the answer table), `src/shared/http/interceptors/__tests__/idempotency.store.int.spec.ts` (db 0 on the wire); `src/v1/auth/__tests__/auth.service.spec.ts` and `src/v1/auth/README.md` (login never retried: the lockout counter makes a retried verify count twice).
- **Instead:** Put `@Idempotent()` on the handler after `@UseGuards(JwtAuthGuard, ...)` (the interceptor needs `request.user`; the stored status is the handler's `@HttpCode`, else 201 for a POST); make the repository write idempotent by a unique key as the second layer.

### BE-16 Integrations are ports and adapters; modules import ports only; one breaker per external system

- **Rule:** A third-party system is reached through an interface in `integrations/ports/` (with a DI token), implemented by `integrations/adapters/<system>/<vendor>.adapter.ts` plus a `fake-<system>.adapter.ts`, wired only in `src/integrations/integrations.module.ts`; inbound calls land in `integrations/webhooks/` (raw body, signature verification, then enqueue); every external system has exactly one breaker name in `BREAKER_NAMES` (`src/shared/resilience/breaker.ts`: legacy, sap, email, sms, payment), added in the same PR as the adapter together with a README Resilience line; vendor SDKs are dependencies of the adapter file only.
- **Where:** erp-api `src/integrations/`, `src/shared/resilience/breaker.ts`.
- **Enforced by:** `G_ADAPTERS` (`no-restricted-imports`, group `**/adapters/**`, message "adapters are wired in integrations.module.ts; everything else sees ports only (BE-16)") in scopes 1–10 and 16; scope 11 (`integrations.module.ts`) is the one place without it; `tsc` (`BreakerName` union: a breaker for an unlisted system does not compile); `corepack yarn check:arch` proves scope 10 fires and 11 does not. `ports/` and `adapters/` exist: the email port (`EMAIL_PROVIDER`, `src/integrations/ports/email-provider.port.ts`), `adapters/email/smtp.adapter.ts` with `fake-email.adapter.ts`, wired in a `@Global()` `integrations.module.ts`; vendor SDKs stay in the adapter file: `P_NODEMAILER` (`no-restricted-imports`) in every scope but scope 16, proven by `corepack yarn check:arch`, and the failure table by `src/integrations/adapters/email/__tests__/smtp-classify.spec.ts`; `webhooks/` does not exist yet: built by the first module that needs an inbound call, with its spec alongside.
- **Instead:** `constructor(@Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway)` in the transport; the fake adapter in unit tests, local development and the staging "no real money" mode; the adapter uses the BE-18 nesting with its own breaker name.
- **Why:** `03-architecture/03-backend-components.md`; `src/integrations/README.md`.

### BE-17 Sessions live on Redis db `AUTH_REDIS_DB` under the `auth:` key layout through the module's own client

- **Rule:** The auth module keeps sessions, session sets, token versions, revoked `jti`s, permission snapshots and lockouts under the `auth:*` keys built by `authKeys` (`src/v1/auth/repository/auth-session.store.ts`) on logical database `AUTH_REDIS_DB` (1) through its own ioredis client (`src/v1/auth/repository/redis-auth-session.store.ts`) with the `TIMINGS.redis` fail-fast options, connected in `onModuleInit` so an unreachable auth Redis fails the boot; refresh rotation, family revoke on reuse, e-mail-keyed lockout (429 + `Retry-After`) and the CSRF double-submit hook are not detailed here.
- **Where:** erp-api `src/v1/auth/repository/`, `src/shared/http/fastify-plugins.ts`.
- **Enforced by:** `src/v1/auth/__tests__/auth-session.store.spec.ts` (the contract, run against the in-memory and the Redis implementation), `src/v1/auth/__tests__/auth-session.store.int.spec.ts` (`db=1` on the wire, key names), `src/v1/auth/__tests__/auth.controller.e2e.spec.ts` (rotation, reuse, lockout, CSRF on exactly the three POST paths, and that a refresh answered 0002/0003 clears `erp_refresh` + `erp_session_present` while 0008 and 5xx clear neither).
- **Instead:** A module that needs its own keyed state declares a port beside its repository with a key builder (`authKeys` form), an in-memory fake passing the same contract spec, and the Redis adapter; keys are `<module>:<entity>:{id}`, TTLs come from `TIMINGS.<module>`. `v1/mail` is the second: `mail:server:unreachableSince` and `mail:test:{staffId}` on the cache database 0 through `RedisService` (`src/v1/mail/repository/mail-state.store.ts`, the contract run against both stores in `src/v1/mail/__tests__/mail-state.store.spec.ts`).

### BE-18 Every call that leaves the process is `withRetry` → `breaker.execute` → `timeoutSignal` → `fetch`, in that order, only in a transport file

- **Rule:** An outbound call is written once, in `service/<m>.transport.ts`, as `withRetry(RETRY_POLICIES.<x>, () => breaker.execute((signal) => fetch(url, { signal: timeoutSignal(TIMINGS.http.<x>.timeoutMs, signal) })))` with the breaker taken by name from `BreakerRegistry`; `fetch` is Node's built-in and no HTTP client library is added; a 5xx becomes `UpstreamHttpError` (counted, retried), every other status becomes a value or an `AppError` (neither); an open breaker throws `UpstreamUnavailableError` → 503 `ERP-UPSTREAM-0001` + `Retry-After: ceil(halfOpenAfterMs / 1000)` with zero network calls; a non-idempotent call is never retried.
- **Where:** erp-api `src/v1/<m>/service/<m>.transport.ts`, `src/shared/resilience/`.
- **Enforced by:** `S_FETCH` (`no-restricted-syntax`, selectors `CallExpression[callee.name="fetch"]` and `MemberExpression[object.name="globalThis"][property.name="fetch"]`, message "fetch only in service/*.transport.ts (BE-18)") in scopes 1, 3, 4; `G_RESILIENCE` (`no-restricted-imports`, group `**/shared/resilience/*`) in scopes 1, 3, 4; `P_HTTP_LIBS` (`axios`, `got`, `node-fetch`, `undici`) in scopes 1–14 and 16; `src/shared/resilience/__tests__/breaker.spec.ts`, `src/shared/resilience/__tests__/retry.spec.ts`, `src/shared/resilience/__tests__/timeout.spec.ts`, `src/v1/auth/__tests__/auth.transport.spec.ts`; `corepack yarn check:arch` proves scope 2 permits and scopes 1, 3, 4 forbid.
- **Instead:** Copy `probeLegacySso` in `src/v1/auth/service/auth.transport.ts`; for SAP take `breakers.get('sap')`, `RETRY_POLICIES.vendorHttp`, `TIMINGS.http.vendor.timeoutMs`; expose `fetchImpl`, `now` and `retryDeps` as constructor-assigned fields so the spec injects them; fill the README `## Resilience` bullets. SMTP has no AbortSignal: the email adapter's deadline is nodemailer's per-stage timeouts from `TIMINGS.mail.smtp`, and the `mail.send` queue is its only retry layer (no `withRetry`, no pool requeue).
- **Why:** `01-onboarding/02-first-feature.md` §4 "Any call that leaves the process".

## API conventions

### BE-19 Follow the API conventions: prefix, envelope, problem details, pagination, filtering, sorting, idempotency, audit, health, cache headers — one example each

- **Rule:** Routes live under `api/v1` (`API_PREFIX`; only `UNPREFIXED_ROUTES` (`/health`, `/api/v1/health`, `/.well-known/jwks.json`) sit outside it and a module adds nothing to that list; the documentation pair `/api/v1/docs` and `/api/v1/openapi.json` sits under the prefix, BE-23); a single-resource response is a bare body; a list response is `{ data: T[], meta: { nextCursor: string | null, total?: number } }`, and a list paged both ways answers the superset `meta: { nextCursor, prevCursor, total, rangeStart }` (`listPageMetaSchema`, `src/shared/http/keyset.ts`), and a list that has an export adds `exportLimit` (= `EXPORT_MAX_ROWS`) and `printLimit` (= `PRINT_MAX_ROWS`), so a screen can say each format's limit before the click; the request id is never in a body (it travels in the `x-request-id` response header); every error is `application/problem+json`; lists page with `?limit=<1..500, default 50>&cursor=<opaque>` and answer `meta.nextCursor`; filtering is `?filter[<field>]=<value>` or `?filter[<field>][<op>]=<value>` (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `like`); sorting is `?sort=-<field>,<field>` (leading `-` descending); a keyed POST carries `Idempotency-Key` (BE-15); the published domain event is the audit line until `@Audited()` arrives with the first money or stock write; `/health` is BE-07's body; a public GET states `Cache-Control` from `TIMINGS.<m>.cacheMaxAgeS`; a list's export is `GET <list>/export` with the list's query minus `limit` and `cursor` (each a 400) plus `format` (`csv`, `xlsx`, `pdf` or `print`; absent is `csv`), the repeated `column` (distinct export columns of the module, answered in their order; absent is every column), the repeated `header` (one label per exported column, the header row), the repeated `key` (ticked row keys, 1 to 500 positive integers, only on a list whose module opts in with `keys: 'accept'`, AND-ed with `q` and the row scope; on any other list a 400 on path `key`) and, read for `pdf` and `print` only, the presentation parameters `title`, `yes`, `no`, one `blank` per column, `dateFormat`, `timeFormat` and `timeZone` (PDF and Print show display values, CSV and Excel the wire values); it holds at most `EXPORT_MAX_ROWS` (10,000, inclusive) rows for `csv` and `xlsx` and `PRINT_MAX_ROWS` (1,000) for `pdf` and `print` (`EXPORT_ROW_LIMITS`), or a 400 on path `export` before any row is read, its issue carrying `params: { limit, total }`; CSV is `text/csv; charset=utf-8` with a BOM, CRLF and RFC 4180 quoting, Excel `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (one sheet, a bold frozen header, typed cells, never a formula), PDF `application/pdf` (A4 landscape, title and date line, the header repeated on every page), each an attachment named `<stem>-YYYY-MM-DD.<csv|xlsx|pdf>`, and Print `application/json; charset=utf-8` rows `{ exportedAt, headers, rows }` (every cell a string) with no `Content-Disposition`; every format answers `Cache-Control: no-store`; a `'` goes before a leading `=`, `+`, `-`, `@`, TAB or CR in every CSV and Excel text cell, header labels included (`escapeFormula`); a PDF whose title, date line, header or a cell the standard font cannot draw is a 400 on path `font` with no `params` (the same list answers `format=print`); the one core is `src/shared/http/export.ts` (`parseExportOptions`, `runExport`, `replyExport`) with its writers beside it (`src/shared/http/csv.ts`, `src/shared/http/xlsx.ts`, `src/shared/http/pdf.ts`, `src/shared/http/export-display.ts`).
- **Where:** erp-api `src/shared/http/api-prefix.ts`, every `controller/`, every `dto/` list schema.
- **Enforced by:** the route assertion in every `<m>.controller.e2e.spec.ts` (`UNPREFIXED_ROUTES.map((r) => '/' + r)` is the only allowed unprefixed set: `src/v1/branding/__tests__/branding.controller.e2e.spec.ts`, `src/v1/example-item/__tests__/example-item.controller.e2e.spec.ts`); the template's module serves the pair on the superset meta: `exampleItemListResponseSchema` (with `exportLimit` and `printLimit`), `listExampleItemsQuerySchema` and `exportExampleItemsQuerySchema` (`src/v1/example-item/dto/example-item.dto.ts`; `src/v1/example-item/__tests__/example-item.validator.spec.ts` and the e2e spec: `limit=0`, `page`, `sort=label`, `sort=name,id`, another sort's cursor and any `filter[…]` → 400, the export's headers, BOM, both caps, the four formats and the ticked keys, `x-request-id` minted, echoed, never in a body); `src/shared/errors/__tests__/problem-details.filter.spec.ts`; `src/shared/health/__tests__/health.controller.spec.ts`; `src/shared/http/__tests__/request-id.spec.ts`; `@typescript-eslint/no-magic-numbers` (scope 15: a `max-age` literal is an error). Filtering and sorting have a parser: `src/shared/http/pagination.ts` (`parseListQuery(input, allowedFields)`, `LIST_QUERY_LIMITS`, `FILTER_OPERATORS`), built by `v1/identity` as BE-19's trigger requires and pinned by `src/shared/http/__tests__/pagination.spec.ts`: a case per operator, and a rejection case for an unknown field, an unknown operator, an offset paging key, a limit out of range and a malformed cursor, each `ERP-VALIDATION-0001`; the consuming endpoint's e2e spec covers each operator on the wire when that endpoint lands. `@Audited()` is still built by the first money or stock write. **`GET /api/v1/identity/members` and `GET /api/v1/identity/roles`** answer the superset meta: `total` counts the filters and `q`, never the cursor; `rangeStart` is the 1-based rank of the page's first row, 0 on an empty page; `sort` is ONE segment from `MEMBER_SORT_FIELDS` (`staffId`, `firstName`, `email`, `active`) or `ROLE_SORT_FIELDS` (`roleId`, `name`) in `src/v1/identity/service/identity.validator.ts`, and an unlisted field is a 400, never ignored; Role, Last login and `memberCount` do not sort; roles take `q` (name contains, at most 100 characters) as members do; the cursor is opaque base64url bound to its sort, so a cursor minted under another sort, a tampered one or a bare decimal is a 400 `ERP-VALIDATION-0001`, pinned by `src/shared/http/__tests__/keyset.spec.ts` and `src/v1/identity/__tests__/identity.controller.e2e.spec.ts`. `GET /api/v1/identity/audit` alone keeps `{ nextCursor }`, the `createdAt` allowlist and a cursor of decimal digits. `GET identity/permissions/catalogue` and `GET identity/departments` are not paged at all: neither is a table read, so each carries `meta.total` and no cursor, which is the `total?` half of the envelope. **The list exports**: `GET /api/v1/identity/members/export` is gated `staff.members.view` exactly like the list; `GET /api/v1/identity/roles/export` and `GET /api/v1/expense-categories/export` by the administrator flag in the service (403 `ERP-IDENTITY-0004` for roles, like the roles list; `ERP-AUTH-0005` for expense categories); the columns are `MEMBER_EXPORT_COLUMNS` (7) and `ROLE_EXPORT_COLUMNS` (3) in `src/v1/identity/identity.routes.ts`; a `header` count other than the exported columns, a label over 100 characters or a non-string is a 400 on path `header`, absent means the wire names; all three refuse `key` (no row selection), the template's module accepts it; rows are read in batches of 500 following `nextCursor`; `Content-Disposition: attachment` with a constant stem and the UTC date, `Cache-Control: no-store`: pinned by `src/shared/http/__tests__/export.spec.ts`, `src/shared/http/__tests__/xlsx.spec.ts`, `src/shared/http/__tests__/pdf.spec.ts`, `src/shared/http/__tests__/export-display.spec.ts`, `src/shared/http/__tests__/csv.spec.ts` and the identity, expense-categories and example-item e2e specs. The row fingerprint has `src/shared/http/__tests__/etag.spec.ts` and each editing module's e2e 412 and 428 cases.
- **Instead:** Copy the template's list endpoint (`src/v1/example-item/controller/example-item.controller.ts` → `service.list(query, scope, staffId)` → validator `parseListQuery` → repository keyset page → `{ data, meta: { nextCursor, prevCursor, total, rangeStart, exportLimit, printLimit } }`) and its `exportCsv` for an export (`parseExportOptions`, then the validator's export list parse, then `runExport` with the module's rows reader, its `*_EXPORT_CELLS` with `kind` on date columns and its stem; never a loop, cap or writer of its own): the cursor is opaque and bound to its sort (`src/shared/http/keyset.ts`), paged both ways; a list that joins, filters or reads a real table copies `v1/identity`'s members list and `exportMembers` in `src/v1/identity/controller/identity.controller.ts`. A record a screen edits carries the row fingerprint (no version column): `etag` in the body beside the `ETag` header (`src/shared/http/etag.ts`), the PATCH or PUT takes `@IfMatch()` (428 `ERP-CORE-0014` without it) and the repository compares after the row lock (412 `ERP-CORE-0013`).

Prefix (only `UNPREFIXED_ROUTES` sit outside `api/v1`):

```http
GET /api/v1/branding HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=60
x-request-id: 3f8a2c1e-9b4d-4f6a-8e2b-1c5d7a9e0f42

{ "companyName": "Example Co", "logoUrl": "/uploads/company/logo.png", "logoDarkUrl": null, "theme": {}, "defaultLocale": "en",
  "formats": { "dateFormat": "Y-m-d", "timeFormat": "24", "thousandSeparator": ",", "decimalSeparator": ".", …, "currency": null } }
```

Envelope — a single resource is a bare body (above); a list is `{ data, meta }`:

```http
GET /api/v1/example-item?limit=2 HTTP/1.1
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json
x-request-id: 3f8a2c1e-9b4d-4f6a-8e2b-1c5d7a9e0f42

{ "data": [ { "id": "1", "name": "First", "label": "First (1)", "createdAt": "2026-01-01T00:00:00.000Z" }, { "id": "2", … } ],
  "meta": { "nextCursor": "eyJzIjoiaWQiLCJrIjpbMiwyXSwiZCI6ImFmdGVyIn0", "prevCursor": null, "total": 3, "rangeStart": 1, "exportLimit": 10000, "printLimit": 1000 } }
```

Problem details — the login 401 as the filter emits it (wrong e-mail, wrong password and inactive account are the same body):

```http
POST /api/v1/auth/login HTTP/1.1
Content-Type: application/json

{ "email": "staff@example.com", "password": "<wrong>" }

HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
x-request-id: 3f8a2c1e-9b4d-4f6a-8e2b-1c5d7a9e0f42

{ "type": "about:blank", "status": 401, "title": "Invalid credentials", "detail": "Invalid credentials", "code": "ERP-AUTH-0001" }
```

Pagination — `?limit&cursor`, `limit` 1..500 (default 50), `cursor` the opaque `meta.nextCursor` (or `meta.prevCursor`) sent back with the same `sort`; `limit=0`, `limit=501` or another sort's cursor is `400 ERP-VALIDATION-0001` with `issues`:

```http
GET /api/v1/example-item?limit=2&cursor=eyJzIjoiaWQiLCJrIjpbMiwyXSwiZCI6ImFmdGVyIn0 HTTP/1.1
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json

{ "data": [ { "id": "3", "name": "Third", "label": "Third (3)", "createdAt": "2026-01-03T00:00:00.000Z" } ],
  "meta": { "nextCursor": null, "prevCursor": "eyJzIjoiaWQiLCJrIjpbMywzXSwiZCI6ImJlZm9yZSJ9", "total": 3, "rangeStart": 3, "exportLimit": 10000, "printLimit": 1000 } }
```

Filtering (`GET /api/v1/identity/members` accepts it; the shape below is the contract every later list follows):

```http
GET /api/v1/<m>?filter[status]=open&filter[createdAt][gte]=2026-01-01&limit=50 HTTP/1.1
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json

{ "data": [ ...rows with status "open" created on or after 2026-01-01... ], "meta": { "nextCursor": null } }
```

Sorting (the grammar `parseListQuery` parses; each list admits only its own allowlist, and the two identity lists one segment; an unknown field or operator is `400 ERP-VALIDATION-0001`):

```http
GET /api/v1/<m>?sort=-createdAt,name HTTP/1.1
Authorization: Bearer <access-token>

HTTP/1.1 200 OK
Content-Type: application/json

{ "data": [ ...newest first, then by name ascending... ], "meta": { "nextCursor": null } }
```

Idempotency key (contract — the interceptor arrives with the first keyed POST; the codes are reserved today):

```http
POST /api/v1/<m> HTTP/1.1
Authorization: Bearer <access-token>
Idempotency-Key: 01J9X6Q4R8ZK2M5N7P3T9V1W4Y
Content-Type: application/json

{ "name": "First" }

HTTP/1.1 201 Created
Content-Type: application/json
Idempotent-Replayed: false

{ "id": "ex-4", "name": "First", "label": "First (ex-4)", "createdAt": "2026-09-19T10:00:00.000Z" }
```

Audit — the domain event is the audit line (`auth.login.succeeded` carries `{ staffId, sessionId, at }`); the lockout that follows five failures shows the `Retry-After` form:

```http
POST /api/v1/auth/login HTTP/1.1
Content-Type: application/json

{ "email": "staff@example.com", "password": "<sixth wrong attempt>" }

HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 60

{ "type": "about:blank", "status": 429, "title": "Too many failed attempts; account temporarily locked", "detail": "Too many failed attempts; account temporarily locked", "code": "ERP-AUTH-0006" }
```

Health — both paths, probes plus breaker states; 503 carries the same shape with `"status": "degraded"`:

```http
GET /api/v1/health HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{ "status": "ok", "checks": { "db": "ok", "redis": "ok", "breakers": { "legacy": "closed" } } }
```

Cache headers — a public GET states its `max-age` from `TIMINGS` (`` @Header('Cache-Control', `public, max-age=${String(TIMINGS.auth.jwksCacheMaxAgeS)}`) `` in `src/v1/auth/controller/jwks.controller.ts`):

```http
GET /.well-known/jwks.json HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=300

{ "keys": [ { "kty": "RSA", "n": "<modulus>", "e": "AQAB", "alg": "RS256", "use": "sig", "kid": "<thumbprint>" } ] }
```

## Wiring, tests and the template

### BE-20 A `src/v1/**` module is never `@Global()` (auth excepted); it exports its facade; `shared/` never imports `v1/`; ports point inward

- **Rule:** A module under `src/v1/` is a plain `@Module` (never `@Global()` — `auth.module.ts` is the one exception because it provides the identity port), lists every layer as a provider, `exports: [<M>Facade]` and at most a port token by `useExisting: <M>Facade`, and is imported in `src/v1/v1.module.ts`; `src/shared/**` never imports `v1/` — where `shared/` needs module behaviour it declares a port (`ACCESS_TOKEN_VERIFIER` in `src/shared/http/auth/access-token-verifier.ts`) and the module provides it; `src/main.ts` is the composition root and may import `v1/auth/index.js`; a cross-cutting HTTP check Nest's pipeline cannot see lives in a Fastify hook (`src/shared/http/fastify-plugins.ts` for CSRF because the adapter drops the plugin's error code; `src/shared/http/request-id.ts` registered before every other plugin). `shared/*/*.module.ts` are `@Global()` by design and outside this rule.
- **Where:** erp-api `src/v1/<m>/<m>.module.ts`, `src/v1/v1.module.ts`, `src/shared/**`, `src/main.ts`.
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` (`@Global()` string match over every `src/v1/*/*.module.ts` — never write the literal, not even in prose; registration `./<m>/<m>.module.js` in `v1.module.ts`); `G_V1_FROM_SHARED` (`no-restricted-imports`, regex `/v1/`, message "shared/ never imports v1/ — declare a port (BE-20)") in scopes 7–9, absent from scope 10 so `main.ts` may import the auth index; `src/v1/auth/__tests__/auth.facade.spec.ts` (the facade resolves through the module and `ACCESS_TOKEN_VERIFIER` is the same instance); `corepack yarn check:arch`.
- **Instead:** `@Module({ imports: [EventsModule], controllers: [XController], providers: [every layer, XFacade], exports: [XFacade] })`; a guard that needs a module's behaviour gets a port in `shared/http/auth/` and the module provides it `useExisting`. The shared ports today: `ACCESS_TOKEN_VERIFIER`, `PASSWORD_HASHER` (`src/shared/crypto/password-hasher.port.ts`), `STORAGE` (`src/shared/storage/storage.port.ts`: Node's own volume now, object storage later, never Perfex's disk) and the upload purposes (`UploadPurposeRegistry`, `src/shared/uploads/upload-purpose.ts`: the module that owns the rows registers its purpose in `onModuleInit`). A module a deployment can switch off puts `@ModuleKey('<m>')` and `@UseGuards(ModuleEnabledGuard)` on every controller CLASS, so each handler's guards stay `[JwtAuthGuard, PermissionGuard]`, and its upload purposes call `ModuleSwitch.assertEnabled`; a new switchable module appends its name to `MODULE_NAMES` in `src/shared/config/env.schema.ts` and its erp-web mirror (src/config/modules.ts there) in the same change. The switch is proven by `src/__tests__/no-vendor-licence.spec.ts` (no vendor licence check).
- **Why:** `03-architecture/03-backend-components.md`.

### BE-21 Every layer present has its spec; the controller has an in-process e2e spec; the repository has an int spec

- **Rule:** Every test file lives in a `__tests__/` folder beside the code it tests — `src/v1/<m>/__tests__/`, `src/shared/<area>/__tests__/`, `src/__tests__/` for the whole-app int spec — never colocated with the file; `src/v1/<m>/__tests__/` holds `<m>.controller.e2e.spec.ts` (an in-process Fastify app from `create-<m>-test-app.ts` with the fake repository, `registerRequestId`, the prefix and `ProblemDetailsFilter`; asserts status, problem bodies, `x-request-id` and the unprefixed route set), `<m>.service.spec.ts`, `<m>.facade.spec.ts` (resolves through the module), one `<m>.<layer>.spec.ts` per optional layer present, `<m>.repository.int.spec.ts` when the repository touches `this.prisma` (skips itself without `DATABASE_URL`, restores what it writes), plus `fakes.ts`; unit specs never touch Prisma or the network; `corepack yarn test` runs `src/**/*.spec.ts` minus `*.int.spec.ts`, `corepack yarn test:int` runs the int specs against the local stack.
- **Where:** erp-api `src/v1/<m>/__tests__/`, `vitest.config.mts`, `vitest.int.config.mts`.
- **Enforced by:** `src/__tests__/test-placement.spec.ts` (every `*.spec.ts` under `src/` has `__tests__` as its parent folder; a colocated file fails naming the move); `src/v1/__tests__/module-shape.spec.ts` (spec-per-layer clause: the three required names, one per optional layer file present, the int spec when `this.prisma` appears); `vitest.config.mts` include/exclude (an int spec cannot run in the unit suite); scope 5 (`P_PRISMA` + `G_PRISMA` in unit specs) and scope 6 (int specs permitted).
- **Instead:** The template ships all of them (BE-22); auth's set is the full example (`src/v1/auth/__tests__/create-auth-test-app.ts`, `fakes.ts`, seven layer specs, `auth-session.store.spec.ts` as a port contract run against both implementations, three int specs).
- **Why:** `02-coding-rules/02-testing.md`; `01-onboarding/02-first-feature.md` §2.

### BE-22 New modules come from the backend-module template; `v1/example-item` is its checked-in copy and is never edited by hand

- **Rule:** Create a module by copying `src/v1/example-item/` of the template `05-templates/backend-module/` into erp-api `src/v1/<name>/` and renaming the four spellings (name grammar `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, 2–40 characters, not `shared`, `integrations` or `__tests__`); the screen routes of the pair may sit under one URL segment (`/setup/<name>` for the Wave 2a lists), which changes only the route-gates spec's screen keys; erp-api's `src/v1/example-item` is a copy of the template; to change it, change the template and copy it again (then erp-api `corepack yarn format:write`); the template's stub `src/shared/` surface (28 copied files + 1 stub, the export core and its writers included) is a copy of erp-api's, and the template pins `write-excel-file`, `pdfkit` and `@types/pdfkit` exactly as erp-api does for those byte copies; its ESLint and compiler configuration is a byte copy of `configs/`, like erp-api's (the block itself changes only in `configs/eslint/backend.mjs` and is re-copied into both). The one module not copied from the template is `v1/settings`, BE-01's facade-only exception: a copy of the template is a five-route resource it does not have.
- **Where:** `05-templates/backend-module/`; erp-api `src/v1/example-item/`, `configs/` (the byte copy its `eslint.config.mjs` consumes).
- **Enforced by:** `05-templates/backend-module/src/v1/example-item/__tests__/route-gates.spec.ts` (every handler classified and gated).
- **Instead:** Copy the template to `src/v1/<name>/`, then: register in `v1.module.ts`, fill the README, claim the table and swap the store for the Prisma delegate, declare the `<name>.*` codes, copy `05-templates/frontend-feature/` for the screens, `corepack yarn check`.
- **Why:** `05-templates/backend-module/README.md`.

### BE-23 Every handler carries `@ApiZod` with its zod schemas and error codes; the OpenAPI document is generated at boot, served at `/api/v1/docs`, off in production

- **Rule:** Every handler carries one `@ApiZod({ summary, body?, query?, params?, responses, errors?, security?, headers?, produces? })` (`src/shared/http/openapi.ts`) naming the zod schemas that already validate the wire (`dto/<m>.dto.ts`) and the `ERROR_CODES` entries the service can raise; the OpenAPI 3.1 document is generated at boot from those schemas with zod 4's `z.toJSONSchema()` (never hand-written — no `@ApiProperty` class, no second schema library), every error response is `application/problem+json` with the shared `ProblemDetails` schema and the `code` enum the handler declares, `x-request-id` is documented on every response, the bearer security scheme applies unless `security: 'none'` (a public route is a decision the README states), and `@nestjs/swagger` serves the UI at `/api/v1/docs` and the JSON at `/api/v1/openapi.json` only when `API_DOCS_ENABLED` is true (default `true` outside production, `false` in it — neither route exists when disabled).
- **Where:** erp-api `src/shared/http/openapi.ts`, `src/shared/http/status.ts`, every `controller/`, `src/shared/config/env.schema.ts`, `src/main.ts`.
- **Enforced by:** `src/v1/__tests__/openapi-covers-routes.spec.ts` (the whole `V1Module` plus health in-process with docs on: every non-HEAD route under `/api/v1/` or in `UNPREFIXED_ROUTES` has an operation with a summary (`SwaggerModule` emits a bare operation for an undecorated handler, only `@ApiZod` gives it one), a 2xx response with an `application/json` schema or an explicit 204 without one or, for a `produces: 'export'` handler, the one 200 equal to `EXPORT_SUCCESS`: `text/csv` (a string), the xlsx media type, `application/pdf` (no schema) and `application/json` (`exportPrintRowsSchema`) (both blocks: the first sees the template's `/api/v1/example-item/export`, the second `v1/identity`'s own app), `x-request-id` on every response, every problem+json `code` in `ERROR_CODES` with that code's status, documented paths registered, two builds byte-equal); `src/shared/http/__tests__/openapi.spec.ts` (zod → JSON Schema derivation, metadata round-trip, code enum, disabled mode 404, enabled mode 200); `src/__tests__/app.e2e.int.spec.ts` (the docs pair registered under the prefix with HEAD twins, 200 through Nginx, gzip once); `tsc` (`errors` is `readonly ErrorCode[]`: an unknown code does not compile).
- **Instead:** Copy a decorated handler: `@ApiZod({ summary: 'List ExampleItem records (keyset paging, one sort, q)', query: listExampleItemsQuerySchema, responses: { [HTTP_STATUS.OK]: exampleItemListResponseSchema }, errors: ['ERP-VALIDATION-0001', 'ERP-AUTH-0004', 'ERP-AUTH-0005'] })` in `src/v1/example-item/controller/example-item.controller.ts`; `responses: { [HTTP_STATUS.NO_CONTENT]: null }` for an empty body; `headers: ['Set-Cookie']` for a cookie-setting route; `produces: 'export'` with `responses: {}` and `headers: ['Content-Disposition', 'Cache-Control']` for a list export, which documents one 200 as `text/csv` (string), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/pdf` (no schema) and `application/json` (the print rows) (`exportMembers`); a zod feature `toJSONSchema` cannot express is replaced in the DTO or described with `.meta({ description })`, never worked around with a hand-written schema.
- **Why:** `03-architecture/03-backend-components.md` (API documentation); zod is the one validation library; the route map is not public.

### BE-24 Hygiene: no `debugger`, `eval` or loose equality, `const` by default, no parameter reassignment, every `eslint-disable` described and used, no focused test

- **Rule:** No `debugger`, `eval`, implied eval or `new Function`; `===` always (`eqeqeq`); `const` unless reassigned (`no-var`, `prefer-const`); a parameter is never reassigned (`no-param-reassign`, properties excepted); every `eslint-disable` directive carries a `-- reason` and an unused one is an error; no `.only` reaches `main`, a `.skip` is a warning to resolve, every test asserts something, no two tests share a title; `console.*` is BE-10's `no-console`.
- **Where:** erp-api `src/**/*.ts` (`HYGIENE`), `src/**/*.spec.ts` and `src/**/__tests__/**` (`TEST_HYGIENE`): the two objects at the end of the architecture block in `configs/eslint/backend.mjs`, byte-copied into erp-api and the template.
- **Enforced by:** `corepack yarn lint` (the `HYGIENE` object: `no-debugger`, `no-eval`, `no-implied-eval`, `no-new-func`, `eqeqeq` `always`, `no-var`, `prefer-const`, `no-param-reassign` `{ props: false }`, `@eslint-community/eslint-comments/require-description`; `configs/eslint/base.mjs`: ESLint's `linterOptions.reportUnusedDisableDirectives: 'error'`; the `TEST_HYGIENE` object: `vitest/no-focused-tests` `error`, `vitest/no-disabled-tests` `warn`, `vitest/expect-expect`, `vitest/no-identical-title`); `corepack yarn check:arch` proves `no-debugger`, `eqeqeq`, an undescribed and an unused directive and `it.only` fire and a described directive is silent.
- **Instead:** Fix the code, never widen an ignore: name the constant, compare with `===`, return a new value instead of reassigning the argument, and when a directive is truly needed write `// eslint-disable-next-line <rule> -- <why, one line>` and remove it when the reason is gone.
- **Why:** `02-coding-rules/01-typescript-and-lint.md` (TS-01..05, the typed lint base); a focused test silently shrinks the suite; `03-architecture/03-backend-components.md`.

### BE-25 Only `v1/identity` writes the identity tables; granting requires the administrator flag, never a permission code; every identity change writes one append-only audit row in the same transaction

- **Rule:** `src/v1/identity` is the only module that may name `tblstaff_permissions` or `tblroles` or import `v1/identity/repository/`, and the only one besides `v1/auth` that may name `tblstaff` — `v1/auth`'s allowance is column-scoped to `password` (the re-hash), `last_login` and `last_ip`, written down in `src/v1/auth/README.md` `## Owned tables`, and covers no granting column; a request that would set or change a member's role, permission set or `administrator` flag, or that creates, changes or deletes a role at all, requires `tblstaff.admin = 1` on the **actor** and declares **no** permission code (`staff.roles.create`/`edit`/`delete` stay in the `@erp/contracts` mapping for Perfex's own screens and gate nothing here); **reading a role is administrator-only for the same reason** — a role IS a permission template, so `GET roles` and `GET roles/:id` assert the flag in the service exactly as `GET audit` does, and `staff.roles.view` also gates nothing on them (migration-lead decision 2026-09-24; it stays in the mapping and still admits `GET permissions/catalogue`, which is the list of code NAMES, not any role's template); **the gate on a route is declared once**, in `@erp/contracts`' `ROUTE_GATES` — route path → a clean code or the literal `'admin'` — which erp-web's menu and route helpers read and a test in each repository verifies against, because the gate that drifted had been written down twice with nothing comparing them; every such change writes exactly one append-only `tblidentity_audit` row per affected subject — actor, subject, what changed, before, after, the request's `x-request-id`, the timestamp — inside the same transaction as the change; and no business module ships a permissions screen. A module copied from the template declares its own `<m>.*` codes in `<m>.routes.ts`: in no catalogue, so only an administrator holds them until `@erp/contracts` declares them — the same fail-closed default as the frontend-feature template's `ADMIN_GATE`, and both flip together.
- **Where:** erp-api `src/v1/**`, `src/shared/**` (the clauses walk both; `src/shared/db/generated/` is Prisma's output and is skipped).
- **Enforced by:** `src/v1/__tests__/module-shape.spec.ts` — **the only module-level enforcement this rule has** (the identity-tables, shared-`tblstaff` and `identity/repository/` clauses, each walking `src/v1/**` *and* `src/shared/**` over comment-stripped sources, with `STAFF_TABLE_ALLOWLIST` and `SHARED_CLAUSE_EXEMPT` as named constants carrying the reason — a grep would test the word, not the property); `src/v1/identity/__tests__/identity.controller.e2e.spec.ts` (a bearer holding **every** code in the catalogue is refused 403 by `POST /roles`, `PATCH /roles/:id`, `DELETE /roles/:id`, every member granting field **and both roles reads** — `staff.roles.view` included — while an administrator gets 200, one case per handler); `src/v1/identity/__tests__/route-gates.spec.ts` (every handler's decorators compared with `ROUTE_GATES`: a route gated `'admin'` carries neither `@Permissions` nor `@PermissionsAny` and its service method calls `assertAdministrator`, a route gated on a code carries exactly that code, and every handler must be classified — a new endpoint fails the spec until somebody says which screen gate governs it); `src/v1/identity/__tests__/identity.service.int.spec.ts` (exactly one audit row per role create, update and delete; 1 + N×M rows for an `applyToMembers`; a forced mid-write failure leaves no row of any kind, audit row included); `src/v1/identity/__tests__/granting-policy.spec.ts` (all 507 catalogue codes still refuse a non-administrator); the Prisma ownership guard `src/shared/db/ownership-guard.ts`, which is **table-level and does not enforce the module half of this rule** — it checks `ownership.get(table) !== 'node'`, so now that all four identity tables are `node`-owned a repository in any module writing them passes it at runtime; it still refuses every write to a Perfex-owned table; `corepack yarn check`.
- **Instead:** A module that needs to know what a staff member may do asks `identity.facade.permissionsOf(staffId)` or reads the `auth:perm:{staffId}` snapshot through `PermissionGuard`; a module that must react to a change subscribes to `identity.member.*` / `identity.permissions.replaced` (BE-13). Never a second permissions screen, never a write to an identity table from another repository, and never a permission code as the gate on granting — delegating granting to a non-administrator is a scoped capability with its own ADR, not a code. A screen's gate is added to `ROUTE_GATES` and read from there on both sides; restating it in a menu or a decorator is what drifted.
- **Why:** seven Perfex modules shipped the screen and four let a non-admin through.

## Where the code and the earlier text disagreed

| Topic | Earlier text | As built | Which changed and why |
|---|---|---|---|
| Response envelope | `{ data, meta: { requestId } }` on every response (`ResponseEnvelopeInterceptor`) | bare single resource, `{ data, meta }` lists, `x-request-id` header | rule changed: erp-web, `/status`, `erp_sso` (JWKS) and Compose (health) already consume bare bodies; an interceptor would need exclusions anyway |
| Log transports | winston daily-rotate files | Console only, JSON (pretty in development) | rule changed: Docker captures stdout; rotation and shipping are erp-infra's |
| Guards | "guards and interceptors are global" | `@UseGuards(JwtAuthGuard, PermissionGuard)` per handler; `login`, `csrf`, branding, JWKS, health deliberately anonymous | rule follows code: an anonymous handler is a decision the README's Endpoints table states; a "names its guard or `@Public()`" check is a candidate |
| Validation | global `ZodValidationPipe` in `shared/validation/` | the module's validator calls `safeParse` and throws `AppError('ERP-VALIDATION-0001', …, { issues })` | rule follows code; `shared/validation/` is reserved |
| Config | Nest `ConfigService` | `AppConfig` in `app-config.ts` | rule follows code |
| Exception filter | `global-exception.filter.ts` | `problem-details.filter.ts` | rule follows code |
| Outbound HTTP | `shared/transport/http-client.factory.ts` (axios/undici) | `shared/resilience/` around built-in `fetch` | superseded |
| `Result` type | typed `Result`, converted by a controller base | a returned reason value or a thrown `AppError`; no base classes | rule follows code: two modules needed none; `shared/base/` is reserved |
| Error code format | `ERP-<MODULE>-<NNNN>` | `ERP-<AREA>-<NNNN>` (`VALIDATION`, `AUTH`, `CORE`, `UPSTREAM`, `INTERNAL`; `ERP-HTTP-<status>` for a stray Nest exception) | rule follows code |
| `v1/example-item` | "the reference module" | a checked-in copy of the template; `v1/auth` is the reference, `v1/branding` the smallest complete module | decided: the one place the template compiles against the real `shared/` and guarded client on every `check` |
| Module README template | a standalone module-doc template | `05-templates/backend-module/src/v1/example-item/README.md`, copied with the module | retired into the template so README and file set cannot drift |
| Health budgets | `shared/health/health.timeouts.ts` | `TIMINGS.health` | code changed: literals outside `TIMINGS` contradicted BE-11 |
| Branding controller | the controller called the transformer | `BrandingService.currentResponse()`; the controller injects the service only | code changed: the two references must agree on BE-08 |
| Request context | "arrives later" | `shared/logger/request-context.ts` + `shared/http/request-id.ts` | code changed: BE-10 needs it true |
| Redis databases | BullMQ on db 1 while auth defaulted to db 1 | cache 0, auth 1, queues 2 | design changed: no two purposes share a database |
| API documentation | "Swagger" as a Definition-of-Done item, nothing built | `@ApiZod` + `z.toJSONSchema()`, `/api/v1/docs`, `openapi-covers-routes.spec.ts`, off in production | built: a document nobody writes cannot drift |
| Test placement | shared specs colocated (`shared/<area>/<name>.spec.ts`), root `app.e2e.int.spec.ts` | every spec in a `__tests__/` folder beside its code; `src/__tests__/test-placement.spec.ts` | lead rule 2026-09-20; erp-web follows |
| Layer enforcement | "a grep in CI keeps it that way"; `boundaries` later | core ESLint scopes + `check:arch` now; the verbatim move to `configs/eslint/backend.mjs` is done; `eslint-plugin-boundaries` is not adopted (01-typescript-and-lint.md TS-07) | built without a new dependency |

## Related

- Architecture: `03-architecture/03-backend-components.md`, `03-architecture/05-strangler-fig-migration.md`.
- Rules cross-referenced: `02-coding-rules/01-typescript-and-lint.md` (TS-01..05), `02-coding-rules/07-database.md` (DB-02..04), `02-coding-rules/02-testing.md`.
- Onboarding: `01-onboarding/02-first-feature.md`; template: `05-templates/backend-module/README.md`.
