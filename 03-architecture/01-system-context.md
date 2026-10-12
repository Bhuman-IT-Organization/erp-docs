# System context (C4 level 1)

The ERP serves one customer per deployment. During the migration, two systems share the database behind one Nginx entry point. After the last module is cut over, the legacy box disappears and nothing else changes.

```mermaid
flowchart LR
  subgraph People
    U[ERP users<br/>staff, managers, admins]
    OPS[Operations team]
  end

  subgraph "Customer stack (one per customer per environment)"
    NG[Nginx<br/>TLS, load balancer,<br/>strangler router]
    WEB[erp-web<br/>Next.js]
    API[erp-api<br/>NestJS + Fastify]
    WRK[erp-api worker<br/>jobs, outbox relay]
    LEG[Legacy ERP<br/>Perfex · CodeIgniter 3<br/>transitional]
    DB[(MySQL)]
    RD[(Redis<br/>cache · auth · queues)]
  end

  subgraph "External systems"
    PAY[Payment gateway]
    SMS[SMS provider]
    MAIL[Email provider]
    STO[Object storage]
  end

  U -->|HTTPS| NG
  NG -->|migrated UI routes| WEB
  NG -->|/api/v1/* migrated modules| API
  NG -->|everything else| LEG
  WEB -->|/api/v1 via axios| NG
  API --> DB
  API --> RD
  WRK --> DB
  WRK --> RD
  LEG --> DB
  API -->|ports and adapters| PAY
  API --> SMS
  API --> MAIL
  API --> STO
  PAY -->|webhooks| NG
  OPS -->|Compose, runbooks| NG
```

## Actors

| Actor | Interaction |
|---|---|
| ERP users | Use the web application. During coexistence they do not know which system serves a screen; the login page is served by Next.js from the first wave. |
| Operations team | Deploys with Docker Compose per customer and environment from `erp-infra`, runs backups and runbooks. |
| External systems | Reached only through the integration layer (ports and adapters) in `erp-api`; inbound webhooks enter through Nginx to `/api/v1/webhooks/:provider`. |

## Boundaries

- One customer stack contains everything for that customer: no shared database or Redis between customers.
- Nginx is the only public entry. `web`, `api`, `worker`, `mysql`, and `redis` sit on a private Compose network.
- The legacy system (Perfex on CodeIgniter 3) is a temporary container in the same stack. It joins the stack at wave minus one. Removing it after the last cutover is a Compose change and a Nginx routing change (see `05-strangler-fig-migration.md`).

## What this diagram does not show

Environments (`local`, `dev`, `uat`, `prod`) are copies of the same shape with different env files. Monitoring is a separate `erp-ops` Compose project (not decided yet).
