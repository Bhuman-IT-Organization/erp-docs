# ERP: from a bare laptop to the running stack

Written for a developer joining this project. macOS and Windows; Linux is the macOS column. Budget about an hour, most of it Docker pulling images.

## 0. What this is

The client runs a customised **Perfex CRM (PHP, CodeIgniter 3)**. It is being replaced module by module with **NestJS (`erp-api`)** and **Next.js (`erp-web`)** behind one Nginx, while the old system keeps running: the *strangler fig*. Nginx decides who answers each URL. A page that has been migrated is served by Node; everything else falls through to Perfex.

In this copy, Node serves:

| Area | Screens | Node path |
|---|---|---|
| Login | sign-in, sign-out, single sign-on into Perfex | `/login`, `/logout` |
| Setup | Staff, Roles | `/setup/staff`, `/setup/roles` |
| Setup | Cost Centers | `/setup/cost-centers` |
| Setup > Finance | Tax Rates, Currencies, Payment Modes, Expenses Categories | `/setup/taxes`, `/setup/currencies`, `/setup/payment-modes`, `/setup/expense-categories` |
| Setup > Email | Email Templates, Sent Emails, Email Status | `/setup/email-templates`, `/setup/sent-emails`, `/setup/email-status` |

Every other sidebar item opens the Perfex page. It has a small external-link glyph and otherwise looks the same.

Reference code to read first: backend `erp-api/src/v1/auth` (every layer, with tests) and `erp-api/src/v1/branding` (the smallest complete module); frontend `erp-web/app/login` with `erp-web/src/features/auth`.

## 1. Tools

| | macOS | Windows |
|---|---|---|
| Node 22 | `brew install node@22` (or nvm) | <https://nodejs.org> LTS 22 |
| Yarn 4 | `corepack enable`. That is all; never install Yarn globally | same, in a terminal run as your user |
| Docker | Docker Desktop, running, with at least 6 GB memory and this folder shared (Settings → Resources) | Docker Desktop with the WSL 2 backend |
| Git | `brew install git` | Git for Windows |

Nothing else. **No PHP, no MySQL, no XAMPP**: they run in containers.

Check: `node -v` → `v22.x`; `corepack yarn -v` → `4.9.x`; `docker info` prints without error.

## 2. Get access and clone

The repositories are private, under the GitHub organisation **Bhuman-IT-Organization**. Ask the lead to add your GitHub account to the organisation first; until then every clone below fails with "repository not found".

Make one folder for the project and clone the five repositories into it:

```sh
mkdir erp && cd erp
git clone https://github.com/Bhuman-IT-Organization/erp-api.git
git clone https://github.com/Bhuman-IT-Organization/erp-web.git
git clone https://github.com/Bhuman-IT-Organization/erp-infra.git
git clone https://github.com/Bhuman-IT-Organization/erp-legacy.git
git clone https://github.com/Bhuman-IT-Organization/erp-docs.git
```

HTTPS asks for your GitHub login the first time (sign in through the browser prompt, or use `gh auth login`). If you have an SSH key on GitHub, use `git@github.com:Bhuman-IT-Organization/<repo>.git` instead.

Every script finds its siblings by relative path, so this folder can live anywhere, but the names inside it must not change:

```text
erp/
  erp-api/        NestJS 12 + Fastify modular monolith
  erp-web/        Next.js 16 App Router + shadcn, Storybook
  erp-infra/      Nginx, Compose, env templates, the erp_sso Perfex module, local-up, legacy-local
  erp-legacy/     the client's Perfex application
    public_html/
    cubepltech_cube.sql   the database export the local stack imports
  erp-docs/       this guide, the coding rules, the architecture and the module templates
```

## 3. The rules about `erp-legacy/`: read twice

That folder is a copy of the client's system. You get it from GitHub with the rest, but it is not yours to change. The production database password and encryption key have been removed from `application/config/app-config.php`; the local stack generates its own.

- It is **read-only**. You read it to learn; you never edit it, and you never commit to it. Nothing you build lives in it (the one module deployed into Perfex lives in `erp-infra/legacy/`).
- **Never paste its contents anywhere**: not into a ticket, a screenshot, a chat or an AI prompt. Treat the `.sql` file as if it held real customer data.
- Passwords in the dump are not yours to know or spread. Set your own on a staff row (step 5).
- Never contact the client's server.

If you are unsure whether something counts as a secret, it does.

## 4. Install and check each app

```sh
cd erp-api && corepack yarn install && corepack yarn check
cd ../erp-web && corepack yarn install && corepack yarn check
```

Both must be green before Docker, with one known exception: `erp-web`'s dependency audit (see [Known issues](#10-known-issues)). `erp-infra`, `erp-legacy` and `erp-docs` have no packages.

`yarn check` runs typecheck, lint, formatting, the architecture and dependency checks, the tests, the build (web) and a dependency audit. The audit needs the internet. `corepack yarn install` also installs the git hooks.

## 5. Bring the stack up

```sh
cd erp-infra
node scripts/local-up.mjs          # first run: ~10 min. Imports the database, builds api and web
```

It imports the dump into MySQL, renders the env files (and a signing key private to your machine, never committed), builds and starts the containers, activates the SSO module in the legacy database, and waits for Nginx. When it prints the URLs, give yourself a password on a staff member:

```sh
cd erp-infra/legacy-local
node reset-password.mjs <a staff e-mail from the dump> "<your own password>"
```

Open **<http://localhost:8088/login>** and sign in. You land on the Perfex dashboard at `/admin/` with no second login: the Next.js login opened a PHP session. From the sidebar, **Setup** holds the Node screens listed in section 0.

Only ever use **8088**. Port 8080 is the Perfex container directly (debugging only). Emails sent by the stack never leave your machine: they are caught by Mailpit at <http://localhost:18025>.

`node scripts/local-down.mjs` stops it; `--volumes` also drops the database (your password goes with it, so run `reset-password.mjs` again after any re-import). A half-finished import is reset with `node setup.mjs --fresh` in `erp-infra/legacy-local`.

Every response carries an `X-Erp-Route: api | web | legacy` header that says who answered, which is the quickest way to see the strangler at work.

## 6. Prove it to yourself

```sh
cd erp-api
corepack yarn test:int      # integration tests against the running stack

cd ../erp-infra
node scripts/verify-wave0.mjs   # the routing and login checks against the running stack
```

Then open Storybook for the shared UI kit and the migrated screens:

```sh
cd erp-web
corepack yarn storybook     # http://localhost:6006
```

## 7. Developer tools

Four tools come with the project. Bookmark them.

| Tool | What it is | How to start it | Open it at |
|---|---|---|---|
| **Storybook** | A catalogue of every screen part, shown on its own | `corepack yarn storybook` in `erp-web` | <http://localhost:6006> |
| **Swagger** (API docs) | A page listing every erp-api route, where you can also try them | starts with the stack (step 5) | <http://localhost:8088/api/v1/docs> |
| **Mailpit** | An inbox that catches every email the app sends | starts with the stack | <http://localhost:18025> |
| **Perfex directly** | The old system without Nginx in front, for comparing screens | starts with the stack | <http://localhost:8080> |

### Storybook

Storybook shows each component (a button, a table, a form, a whole screen) on its own, in each of its states: loading, empty, with data, with an error. You can look at and work on the screen parts without the backend running.

```sh
cd erp-web
corepack yarn storybook     # then open http://localhost:6006
```

- Use the menu on the left: the shared parts are under **Atoms**, **Molecules**, **Organisms** and **Templates**; the migrated screens are under **Features** (e.g. **Features › Taxes**).
- A story lives next to its component, in a file ending in `.stories.tsx`. When you build or change a component, add or update its story.
- `corepack yarn storybook:build` builds every story and fails if one does not render. `corepack yarn check` does not run it, so run it yourself when you changed components.

### Swagger (API docs)

Swagger lists every erp-api route with what it expects, what it answers and which errors it can return. It is generated from the code, so it is always up to date. You can also send real requests from it.

To try a route that needs you to be signed in:

1. Open <http://localhost:8088/api/v1/docs>.
2. Find **`POST /api/v1/auth/login`**, click **Try it out**, enter the staff email and the password you set in step 5, and click **Execute**:
   ```json
   { "email": "<a staff e-mail>", "password": "<your own password>" }
   ```
3. Copy the `accessToken` value from the response.
4. Click **Authorize** (top right), paste the token, and click **Authorize** again.
5. Open any route, click **Try it out**, fill in the fields, and click **Execute**.

- The token lasts **15 minutes**. When requests start answering 401, sign in again (steps 2 to 4).
- The Setup routes (taxes, currencies, …) only answer for an **administrator** account; any other account gets 403.
- The raw API description is at <http://localhost:8088/api/v1/openapi.json>.

### Mailpit

Every email the app sends locally lands here instead of a real inbox, so you can open it and check it. Nothing ever leaves your laptop.

## 8. What to read next

| Folder | What is in it |
|---|---|
| [`CONVENTIONS.md`](CONVENTIONS.md) | The short version: branch names, commit messages, folder structure, response and error shapes, naming |
| [`01-onboarding/`](01-onboarding/) | `02-first-feature.md`: one login request traced through every file it touches |
| [`02-coding-rules/`](02-coding-rules/) | The rules every pull request follows: TypeScript and lint, testing, comments, utilities, backend, frontend, database, git workflow |
| [`03-architecture/`](03-architecture/) | How the system fits together: context, containers, backend and frontend components, the strangler-fig migration |
| [`04-design/`](04-design/) | UI kit decisions and the usability checklist for every screen |
| [`05-templates/`](05-templates/) | The starting point for a new backend module and a new frontend feature: copy, rename, then build |

Each app has its own `README.md`, and every module and feature folder has a README that explains it.

## 9. House rules

- **Yarn 4 via corepack only.** `npm`, `npx`, `pnpm` and a global Yarn 1 corrupt the lockfile.
- **History is rebase-only.** `git config --global pull.rebase true` and `git config --global merge.ff only`. Branch from `dev`, open a pull request into `dev`, merge with **Rebase and merge**; `main` only receives `dev` (and hotfixes) through a pull request. Branch names and commit types are in [CONVENTIONS.md](CONVENTIONS.md). The installed git hooks refuse a direct push to `main` and a merge commit.
- **Commits** are conventional: `type(scope): what and why`, one task per commit, no `Co-Authored-By` trailer. `corepack yarn check` is green in every app you touched before you open the pull request.
- **Every module owns its tables and talks to other modules only through their `facade/`.**
- **No hard-coded user-facing text.** Every label comes from a per-locale message file (`messages/en.json`, `messages/ar.json`); layouts use logical CSS properties (`ms-`, `me-`, `start`, `end`) so Arabic is a locale switch.
- **One build serves every customer.** No customer name, logo or colour in code; brand comes from `GET /api/v1/branding`.
- **A migrated screen is 1:1 with the Perfex screen it replaces**, rebuilt from its view file, with anything deliberately dropped listed in the feature's README.
- **Never patch Perfex.** No edits to its code and no hand-run changes to its database.

## 10. Known issues

- **`erp-web`'s `corepack yarn check` stops at the dependency audit.** `check:audit` reports high-severity advisories in third-party packages: `next` 16.3.6 (fixed in 16.3.8), `sharp` (pulled in by `next`), `@modelcontextprotocol/sdk` (inside the `shadcn` tool) and `braces` (inside `micromatch`). Everything before the audit must pass; the audit failure itself is known and not caused by your change. Do not upgrade these packages in an unrelated pull request.
- **A Perfex page can still change staff permissions behind the Roles screen.** `hr_profile/add_edit_member` (the HR module's member form) writes a staff member's permissions directly, so the change has no audit row and Node keeps the old permissions until that person signs in again. It does not matter on a laptop; it must be closed with an Nginx refusal before this configuration is used on the client's server.
- **Two local stacks on one machine share a database.** Every checkout's stack uses the Compose project name `erp-local`, port 8088 and the same database volume. If you ran the stack before from another folder, the new checkout's generated passwords will not match the old database and setup stops with "Could not query legacy-db". Either stop the other stack and run `node setup.mjs --fresh` in `erp-infra/legacy-local` (it re-imports the dump), or copy the old checkout's `erp-infra/legacy-local/.env` into the new one.
