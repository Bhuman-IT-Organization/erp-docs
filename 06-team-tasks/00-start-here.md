# Start here

Read this page once before you open your task card. It explains how one screen moves from Perfex to Node, the words the cards use, how to read the Nginx part, where to learn the tools, and how to ask for help.

## 1. What "moving a screen to Node" means

Today, when someone opens a Setup screen, this happens:

```text
browser ──► Nginx (localhost:8088) ──► Perfex (PHP) ──► MySQL database
```

After your task, the same screen goes through the new apps instead:

```text
browser ──► Nginx ──► erp-web (Next.js): draws the page
                         │
                         └─ asks for data at /api/v1/...
                               │
             Nginx ──► erp-api (NestJS) ──► the same MySQL database
```

The database does not change. Perfex keeps working for every other screen and still reads the same table. Your job is:

1. **erp-api:** an API that reads and writes the table, with the same rules Perfex has.
2. **erp-web:** the page that shows the list and the form, and calls your API.
3. **erp-infra:** tell Nginx that this screen now belongs to Node, and stop Perfex's old screen from changing the data.

Every response has an `X-Erp-Route` header that says who answered: `web`, `api` or `legacy` (Perfex). Press F12 in the browser, open the **Network** tab and click a request to see it.

## 2. Words on the cards

| Word | What it means |
|---|---|
| **Perfex** | The old application (PHP). It lives in `erp-legacy`. You read it; you never change it. |
| **module** (erp-api) | One folder under `erp-api/src/v1/` that owns one thing, for example `v1/cost-centers`. |
| **controller** | The file that receives an HTTP request (`GET /api/v1/...`) and hands it to the service. No logic of its own. |
| **service** | Where the rules live: "admins only", "refuse the delete if a ticket uses it". |
| **repository** | The only place that talks to the database (through Prisma). |
| **facade** | The door other modules use to talk to your module. Modules never import each other's inside files. |
| **DTO** | The shape of the data going in and out of the API, checked with `zod`. |
| **model** | The shape of the data inside the module. |
| **event** | A message your module sends when something changes ("a priority was deleted"), so other modules can react. |
| **Prisma** | The library erp-api uses to read and write MySQL. `prisma/schema.prisma` describes every table. |
| **ownership register** | `erp-api/prisma/ownership.json`: for every table, which system may write it (`node` or `perfex-core`). Node can only write a table marked `node`. |
| **route gate** | Who may open a page: `ADMIN_GATE` means administrators only. Kept in two files that must match. |
| **feature** (erp-web) | One folder under `erp-web/src/features/` with everything for one screen. |
| **page / route** | A file under `erp-web/app/` that Next.js turns into a URL, for example `app/(shell)/setup/taxes/page.tsx` → `/setup/taxes`. |
| **component** | A piece of the screen (a table, a button, a form). Shared ones live in `erp-web/src/components`. |
| **story** | One example of a component in Storybook, so people can see and test it on its own. |
| **message file** | `messages/en.json` and `messages/ar.json`: every text the user sees, in English and Arabic. |
| **Nginx** | The front door. It looks at each URL and sends it to `web`, `api` or Perfex. |
| **Docker** | Runs MySQL, Redis, Perfex, the apps and Nginx on your laptop, each in its own container. |
| **branch, commit, pull request, rebase** | See "Words you will see" in [`../02-coding-rules/08-git-workflow.md`](../02-coding-rules/08-git-workflow.md). |

## 3. How to read the Nginx section

Every card asks you to write a short Nginx section. Here is the Cost Centers one (search `W2A-03` in `erp-infra/nginx/local/default.conf`), explained block by block. The comments in the real file are left out here.

**Block 1: stop Perfex's old screen from changing the data.**

```nginx
location ~* "^/admin/cost_centers/(?:create|edit|delete)" {
  set $erp_managed_at /setup/cost-centers;
  add_header X-Erp-Route web always;
  default_type application/json;
  include snippets/refuse-legacy-write.conf;
}
```

- `location ~* "..."`: "for every URL that matches this pattern". `~*` means the match ignores upper and lower case, so `/ADMIN/Cost_Centers/delete` is caught too.
- `^/admin/cost_centers/(?:create|edit|delete)`: the URL starts with `/admin/cost_centers/` followed by `create`, `edit` or `delete`. `(?:a|b)` means "a or b".
- `set $erp_managed_at ...`: where the screen lives now. It goes into the error message.
- `include snippets/refuse-legacy-write.conf`: answer **403** with "This list is now managed in the new application." It works for every method (GET and POST), because Perfex's delete is a plain link (a GET).

**Block 2: send people from the old list to the new one.**

```nginx
location ~ "^/admin/cost_centers/?(?:index/?)?$" {
  absolute_redirect off;
  add_header X-Erp-Route $erp_setup_list_route always;
  if ($erp_setup_list_redirect) { return 302 /setup/cost-centers; }
  proxy_pass http://legacy;
  include snippets/proxy-common.conf;
}
```

- The pattern matches `/admin/cost_centers`, `/admin/cost_centers/` and `/admin/cost_centers/index`. `$` means "the URL ends here".
- `$erp_setup_list_redirect` is 1 for a normal page visit (GET or HEAD). Then the person is sent (`302`) to the Node list.
- Anything else (Perfex's table loading its rows with a POST) still goes to Perfex (`proxy_pass http://legacy`), so nothing else on that old page breaks.

**Blocks 3 and 4: the new page belongs to web.**

```nginx
location = /setup/cost-centers {
  add_header X-Erp-Route web always;
  proxy_pass http://node_web;
  include snippets/proxy-common.conf;
}
location ^~ /setup/cost-centers/ {
  add_header X-Erp-Route web always;
  proxy_pass http://node_web;
  include snippets/proxy-common.conf;
}
```

- `location = /setup/cost-centers`: exactly this URL (the list).
- `location ^~ /setup/cost-centers/`: every URL that starts with it (`/new`, `/12`).
- `proxy_pass http://node_web`: hand it to erp-web.

Your section has the same shape. Change the names, and only refuse the Perfex addresses your card lists. Some cards tell you which Perfex address you must **not** block. You add blocks 3 and 4 first (Step 4 of your card), so you can open your page while you build it, and blocks 1 and 2 at the end (Step 5).

Nginx reads its configuration only when it starts, so after every edit restart it, then try each URL in the browser:

```sh
cd ~/erp/erp-infra
docker compose -f compose/local.yml restart nginx
```

If the page then does not load at all, Nginx did not start because of a mistake in the file. See which line:

```sh
cd ~/erp/erp-infra
docker compose -f compose/local.yml logs nginx
```

Undo your last change and look again, or ask.

## 4. Where to learn the tools

You don't need to read all of these before you start. Use them when a card step uses something you haven't seen.

| Tool | Used for | Start with |
|---|---|---|
| JavaScript | everything | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide |
| TypeScript | everything | https://www.typescriptlang.org/docs/handbook/intro.html |
| HTTP | how the browser, Nginx and the API talk | https://developer.mozilla.org/en-US/docs/Web/HTTP |
| React | the screens | https://react.dev/learn |
| Next.js | pages and routing in erp-web | https://nextjs.org/learn |
| NestJS | modules, controllers and services in erp-api | https://docs.nestjs.com/first-steps |
| Prisma | reading and writing the database | https://www.prisma.io/docs |
| zod | checking the data shape (DTOs and form schemas) | https://zod.dev |
| React Hook Form | forms | https://react-hook-form.com/get-started |
| SWR | loading data in a screen. You don't use it directly: use the shared hooks in `erp-web/src/lib/api` (`useCommonApi`, `useCommonMutation`), the way Cost Centers does | https://swr.vercel.app/docs/getting-started |
| next-intl | English and Arabic texts | https://next-intl.dev |
| Tailwind CSS | styling | https://tailwindcss.com/docs |
| shadcn/ui | the base UI components | https://ui.shadcn.com/docs |
| Vitest | tests | https://vitest.dev/guide/ |
| Testing Library | testing components | https://testing-library.com/docs/react-testing-library/intro/ |
| Storybook | stories | https://storybook.js.org/tutorials/ |
| Nginx | the front door | https://nginx.org/en/docs/beginners_guide.html |
| Docker | running the project | https://docs.docker.com/get-started/ |
| Git | branches, commits, rebase | https://git-scm.com/book/en/v2 (chapters 1 to 3) |

Then, in this repository: [`../01-onboarding/02-first-feature.md`](../01-onboarding/02-first-feature.md) walks through one real request file by file. Read it with the code open beside it.

## 5. Handy tips

- **Find text in the whole project:** in VS Code, Cmd+Shift+F (Mac) or Ctrl+Shift+F (Windows). Useful to see how other modules do something.
- **Find a file by name:** Cmd+P or Ctrl+P, then type part of the name.
- **Where am I in the terminal?** `pwd` prints the folder you are in. `ls` lists what is in it.
- **Stop a running command** (like Storybook): Ctrl+C.
- **Web dev mode:** start the project with `node scripts/local-up.mjs --web-dev` and keep `node scripts/web-dev.mjs` running in its own terminal window. Every change you save in `erp-web` then shows at http://localhost:8088 within seconds. Changes in `erp-api` still need `node scripts/local-up.mjs --web-dev` again (a minute or two).
- **Use several terminal windows:** one for `web-dev.mjs`, one for Storybook, one for git and tests.
- **Read the first error, not the last.** When a command prints many errors, the first one is usually the cause.

## 6. How to ask for help

Asking early is better than staying stuck. Try for about 30 minutes; if you are still stuck, ask. Send:

1. Which card and which step you are on.
2. The exact command you ran and the folder you ran it in (`pwd`).
3. The full error text (copy it, don't retype it), or a screenshot.
4. What you already tried.

Never paste a password, a `.env` file or anything from `erp-legacy` into a chat or a ticket.
