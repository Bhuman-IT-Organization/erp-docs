# Task card: Departments

**Goal:** move Setup > Support > Departments from Perfex to Node. When you're done, the menu item opens your new Next.js screen at `/setup/departments` instead of the old Perfex page, and the old Perfex page can no longer change the data.

**Level:** Hard. Allow 6–8 days, including tests. You add write routes to a module the Staff screen depends on.

**Read first:** [`00-start-here.md`](00-start-here.md) explains the words on this card, how one screen moves from Perfex to Node, and how to ask for help.

**Before you start:** you must have finished the setup in the erp-docs `README.md` (the project runs at http://localhost:8088/login and you can sign in), and the one-time git setup in `erp-docs/02-coding-rules/08-git-workflow.md` (section 1). If not, do those first.

## How to read the commands on this card

- Everything inside a grey box is a command. Type it in the **Terminal** (Mac) or **Git Bash** (Windows), then press Enter.
- `cd <folder>` means "go into this folder". Git and yarn commands only work inside the right folder, so always run the `cd` line first.
- The project folder is called `erp`. This card assumes it is in your home folder (`~/erp`). If yours is somewhere else, use your path instead.
- Inside `erp` there are 5 folders, and **each one is its own git repository**: `erp-api` (backend), `erp-web` (frontend), `erp-infra` (Nginx and Docker), `erp-legacy` (the old Perfex app) and `erp-docs` (the guides).
- This task changes **three** of them: `erp-api`, `erp-web` and `erp-infra`. You make the same branch (`feat/departments`) in each of the three, and you open one pull request in each.
- Your pull requests always go into **`dev`**, never into `main`. When the work is approved and stable, the lead moves `dev` to `main`.

## Step 0: Get ready

### The first day

1. Open Docker Desktop and wait until it says it is running.

2. Get the newest code. Each folder is a separate repository, so you update each one. For the three you will change, go to `dev` first:

```sh
cd ~/erp/erp-api
git checkout dev
git pull --rebase

cd ~/erp/erp-web
git checkout dev
git pull --rebase

cd ~/erp/erp-infra
git checkout dev
git pull --rebase
```

Then update the two you only read:

```sh
cd ~/erp/erp-legacy
git pull --rebase

cd ~/erp/erp-docs
git pull --rebase
```

Each one should say `Already up to date.` or list changed files. If you see the word `conflict`, stop and ask the lead.

3. Install the packages:

```sh
cd ~/erp/erp-api
corepack yarn install

cd ~/erp/erp-web
corepack yarn install
```

4. Start the whole project in **web dev mode**. In this mode every change you save in `erp-web` shows in the browser within seconds, without rebuilding anything:

```sh
cd ~/erp/erp-infra
node scripts/local-up.mjs --web-dev
```

Wait until it prints the URLs. Then open a **second** terminal window and start the web app. Leave it running all day:

```sh
cd ~/erp/erp-infra
node scripts/web-dev.mjs
```

Now open http://localhost:8088/login and sign in. Always use **8088**, never 3000.

5. Create your branch `feat/departments` in each of the three repositories:

```sh
cd ~/erp/erp-api
git checkout -b feat/departments

cd ~/erp/erp-web
git checkout -b feat/departments

cd ~/erp/erp-infra
git checkout -b feat/departments
```

### Every next morning

Go back to your branch in each of the three repositories, and start the project in web dev mode:

```sh
cd ~/erp/erp-api
git checkout feat/departments

cd ~/erp/erp-web
git checkout feat/departments

cd ~/erp/erp-infra
git checkout feat/departments
node scripts/local-up.mjs --web-dev
```

Then, in a second terminal window:

```sh
cd ~/erp/erp-infra
node scripts/web-dev.mjs
```

Check which branch you are on with `git branch`. The one with `*` is the branch you are on. Do this in each repository if you are unsure.

## Step 1: Docs first (before any code)

1. **Claim the table.** Open `erp-api/prisma/ownership.json` in VS Code. Press Ctrl+F (Cmd+F on Mac) and search for `"tbldepartments"`. In that block:
    - change `"owner": "perfex-core"` to `"owner": "node"`
    - in `"note"`, write one sentence, for example: "Written by v1/departments; Perfex's department add, edit and delete are closed at Nginx; the HR org chart still writes manager_id and parent_id."

    Without this, the API refuses to save anything to this table. The rule is DB-02 in `erp-docs/02-coding-rules/07-database.md`.

2. **Update the test that lists the Node-owned tables.** A test pins the exact list, so after step 1 it fails until you add your table to it. Open `erp-api/src/shared/db/__tests__/ownership-guard.spec.ts`, press Ctrl+F and search for `names exactly the node-owned tables`. Below it:
    - in the list after `expect(nodeOwned).toEqual([`, add `'tbldepartments'`. The list is in **alphabetical order**, so put it in the right place, not at the end
    - in the comment lines above the list, add one line in the same style, for example: `// Departments claimed tbldepartments for v1/departments.`
    - the same comment block has a line saying `tbldepartments`, `tblcustomfields` and `tblcustomfieldsvalues` are Perfex's again. Change it so it no longer names `tbldepartments`

    Then run the tests and check this one passes:

```sh
cd ~/erp/erp-api
corepack yarn test
```

3. **Update the backend README.** `erp-api/src/v1/departments/README.md` says the module is read-only and that Perfex is the only writer. After your task that is no longer true. Rewrite those parts in plain words: what the module now writes, the rules you will keep (Step 2), the new API routes you plan, which Perfex screens still write the same table (the HR org chart writes the manager and the parent), and anything you plan to leave out and why.

4. **Write your frontend README.** Create `erp-web/src/features/departments/README.md`: the list columns, the form fields, and anything you plan to leave out.

5. Save your work and send it to GitHub, in both repositories:

```sh
cd ~/erp/erp-api
git add .
git commit -m "docs(departments): plan the screen"
git push

cd ~/erp/erp-web
git add .
git commit -m "docs(departments): plan the screen"
git push
```

6. Open a **draft pull request** in each of the two repositories:
    - go to https://github.com/Bhuman-IT-Organization/erp-api and https://github.com/Bhuman-IT-Organization/erp-web
    - click **Compare & pull request**
    - check that **base** says `dev`, not `main`
    - click the arrow next to **Create pull request**, choose **Create draft pull request**, and confirm

    Send both links to the lead and **wait for their OK** before you write code.

## Step 2: Read the Perfex screen (`erp-legacy`), and don't change it

**Never edit anything inside `erp-legacy`.** You only read it.

1. Open http://localhost:8088/admin/departments. Add a department, edit it, delete it. Notice the mailbox (IMAP) fields in the form. Write down what you see: the buttons, the messages, the columns.
2. Open these files in VS Code and read them:
    - `erp-legacy/public_html/application/controllers/admin/Departments.php`: read `index`, `department` and `delete`, and look at `email_exists`, `folders` and `test_imap_connection`
    - `erp-legacy/public_html/application/views/admin/departments/manage.php`: the page and its add/edit box
    - `erp-legacy/public_html/application/models/Departments_model.php`: read `add`, `update` and `delete`
3. The table is `tbldepartments`. The existing module reads six of its columns: `departmentid`, `name`, `hidefromclient` (hide from customers), `calendar_id`, `manager_id` and `parent_id`. The mailbox columns (`email`, `imap_username`, `host`, `password`, `encryption`, `folder`, `delete_after_import`, `email_from_header`) are never read or returned by Node.

**Rules your screen must keep, exactly like Perfex:**

- **Admins only:** only an administrator can open the page or save anything.
- **No delete while in use:** Perfex refuses the delete with the `is_referenced` message when a ticket uses the department (`tbltickets.department`). The module already counts every place that refers to a department (the record's `usage`: tickets, child departments, staff members and more). Refuse the delete when any count is above 0. That is stricter than Perfex; write it in your README.
- **Manager and parent:** the list already shows them. Perfex's HR org chart also writes them, and it stays on Perfex. Ask the lead in Step 1 whether your form edits them too, and write the answer in your README.
- **Mailbox settings:** Node never reads or returns the mailbox (IMAP) columns, so your form has no mailbox fields. Once Perfex's add and edit are closed, decide with the lead in Step 1 how an admin keeps editing a department's mailbox, and write it in your README.

## Step 3: Backend (`erp-api`): add the write routes to the existing module

`erp-api/src/v1/departments` already exists, but it is **read-only**: it has list, read, export and the manager and parent pickers. You add the routes that change data. You do **not** start a new module.

1. Read the whole module, starting with its README: the `controller`, `service`, `validator`, `repository`, `dto`, `model`, `events` and `facade`. Then read `erp-api/src/v1/cost-centers` to see how a module with write routes is built, and the rules in `erp-docs/02-coding-rules/05-backend.md`. **Don't copy its files.**
2. **Don't break the Staff screen.** Identity (the Staff screen) uses `DepartmentsFacade` for its department picker and to check a member's departments, and it registers the "staff members" usage counter with this module. Never change what the facade's existing methods return. Before and after your work, run all the backend tests:

```sh
cd ~/erp/erp-api
corepack yarn test
```

3. Add the write routes, one at a time, each with its tests: create (`POST`), update (`PUT` or `PATCH`, look at what Cost Centers uses) and delete (`DELETE`). For each: the route in `departments.routes.ts`, the handler in the controller, the rule checks in the validator and service, the database write in the repository, and an event in `events/`.
4. Every write is for administrators only, like Perfex. Look at how the existing read routes check that.
5. Add your page permissions to `erp-api/packages/contracts/src/route-gates.ts`: `/setup/departments`, `/setup/departments/new` and `/setup/departments/:id`, all `ADMIN_GATE`.
6. Write tests while you build, not at the end. Include a test for the delete refusal with each kind of usage, and a test that the mailbox columns are never returned.
7. You don't register the module: it is already in `v1.module.ts`.
8. Save your work in small commits as you go:

```sh
cd ~/erp/erp-api
git add .
git commit -m "feat(departments): add the create route"
```

Change the message to say what you did. See `erp-docs/CONVENTIONS.md` for the format.

9. Rebuild the project so your API is live. The API is rebuilt each time you run this, which takes a minute or two:

```sh
cd ~/erp/erp-infra
node scripts/local-up.mjs --web-dev
```

Then open http://localhost:8088/api/v1/docs and try every route, old and new, with the **Try it out** button.

## Step 4: Frontend (`erp-web`)

1. **First, let Nginx send your page to the web app**, so you can open it while you build it. Open `erp-infra/nginx/local/default.conf`, press Ctrl+F and search for `location = /setup/cost-centers`. Below the two Cost Centers blocks (`location = /setup/cost-centers` and `location ^~ /setup/cost-centers/`), add the same two blocks for `/setup/departments`. [`00-start-here.md`](00-start-here.md) section 3 explains every line (blocks 3 and 4).

    Then restart Nginx so it reads the change, and commit:

```sh
cd ~/erp/erp-infra
docker compose -f compose/local.yml restart nginx
git add .
git commit -m "feat(nginx): send /setup/departments to web"
```

    Open http://localhost:8088/setup/departments. A "page not found" from the **new** app (not Perfex) means it worked: the page exists once you create it in item 4. If the page does not load at all, Nginx did not start: run `docker compose -f compose/local.yml logs nginx` in `erp-infra` to see the error.

2. **Before you write any frontend code, find what already exists.** Start Storybook in a third terminal window:

```sh
cd ~/erp/erp-web
corepack yarn storybook
```

Open http://localhost:6006. On the left you see every shared component, grouped as **atoms**, **molecules**, **organisms** and **templates**. Click through them and read their **Docs** tab. For a screen like yours, you will almost certainly use:

- `ListPageTemplate`: the whole list page (title, table, search, add button)
- `SchemaForm`: the add and edit form
- `SearchableSelect`: a picker, if your form edits the manager or the parent
- `ConfirmDialog`: the "are you sure you want to delete?" box
- `PageSkeleton`: the grey loading placeholder
- `InlineError`: an error message under a field

**Rule:** if a component exists, use it. Never build your own table, form, button or dialog. If you really need something that doesn't exist, **ask the lead first**. A new shared component goes in `erp-web/src/components`, with its own story and test, so the next person can reuse it. See also `erp-docs/04-design/01-ui-kit-decisions.md`.

3. Read `erp-web/src/features/cost-centers` to see how a screen is built: `api`, `components`, `hooks`, `pages`, `schemas`, `messages`. Read the rules in `erp-docs/02-coding-rules/06-frontend.md`. **Don't copy its files.** Write your own in `erp-web/src/features/departments`.
4. Create the pages in `erp-web/app/(shell)/setup/departments/`:
    - `page.tsx`: the list
    - `new/page.tsx`: the add form
    - `[id]/page.tsx`: the edit form
    - `error.tsx`: what shows if something breaks

    With web dev mode running, open http://localhost:8088/setup/departments after each save to see your change.

5. Put every text the user sees in `messages/en.json` (English) and `messages/ar.json` (Arabic) inside your feature folder. Never type text directly in the component. Then register both files in `erp-web/src/messages/index.ts`.
6. Add the same page permissions to `erp-web/src/config/route-gates.ts`. They must match the backend file exactly.
7. Make the menu open your page. In `erp-web/src/config/navigation.ts`, find `id: 'departments'` and:
    - change `href` to `'/setup/departments'`
    - replace the `adminOnly` / `permission` line with `...navGateOf('/setup/departments'),`
    - delete the `legacy: true,` line
8. Write a test and a Storybook story for your list and your form (files ending in `.test.tsx` and `.stories.tsx`).
9. Run the frontend tests, then commit:

```sh
cd ~/erp/erp-web
corepack yarn test
git add .
git commit -m "feat(departments): add the list page"
```

10. Before you call the screen finished, go through the checklist in `erp-docs/04-design/02-ui-checklist.md`.

## Step 5: Infra (`erp-infra`)

1. Open `erp-infra/nginx/local/default.conf`. Search for `W2A-03` (the Cost Centers section) and read it to see how a screen moves from Perfex to Node. `erp-docs/03-architecture/05-strangler-fig-migration.md` explains why.
2. Next to the two blocks you added in Step 4, add the rest of your section:
    - refuses Perfex's `/admin/departments/department` (add and edit) and `/admin/departments/delete` addresses, for every method
    - redirects `/admin/departments` to `/setup/departments`

    **Don't** block `/admin/departments/email_exists`, `/admin/departments/folders` or `/admin/departments/test_imap_connection` until the lead has decided how mailbox settings are edited.
3. Restart Nginx so it reads your change, and commit:

```sh
cd ~/erp/erp-infra
docker compose -f compose/local.yml restart nginx
git add .
git commit -m "feat(nginx): close the Perfex Departments screen"
```

4. Try the old Perfex address in the browser: it must take you to your page. If Nginx does not start, run `docker compose -f compose/local.yml logs nginx` to see which line is wrong.

## Step 6: Test everything

1. The full backend check (this takes a few minutes):

```sh
cd ~/erp/erp-api
corepack yarn check
```

2. The backend tests against the running project:

```sh
cd ~/erp/erp-api
corepack yarn test:int
```

3. The full frontend check:

```sh
cd ~/erp/erp-web
corepack yarn check
```

All three must finish with no errors, with one known exception: `erp-web`'s `corepack yarn check` stops at the last step, the dependency audit (`check:audit`). That is a known issue, not your change (see section 10, "Known issues", in the erp-docs `README.md`). Everything **before** the audit must pass. If anything else fails, read the first error, fix it and run it again.

4. Look at your components in Storybook:

```sh
cd ~/erp/erp-web
corepack yarn storybook
```

It opens http://localhost:6006. Find your stories and check them in light mode, dark mode and Arabic. Press Ctrl+C in the terminal to stop Storybook.

5. Check each item under **Done means** by hand in the browser.

## Step 7: Finish the docs and send for review

1. Update both READMEs with what you actually built and anything you left out, and commit them.
2. Put your work on top of the newest `dev`, check it, and push. Do this in **each** of the three repositories:

```sh
cd ~/erp/erp-api
git pull --rebase origin dev
corepack yarn check
git push --force-with-lease

cd ~/erp/erp-web
git pull --rebase origin dev
corepack yarn check
git push --force-with-lease

cd ~/erp/erp-infra
git pull --rebase origin dev
git push --force-with-lease
```

In `erp-web`, `corepack yarn check` stops at the known dependency audit (see Step 6); that is fine as long as everything before it passed. `git pull --rebase origin dev` brings in everyone else's finished work. `--force-with-lease` is needed after a rebase. Use it **only on your own branch**, never on anyone else's: if you share a screen with someone, each of you has your own branch. If git says `conflict`, follow section 5 of `erp-docs/02-coding-rules/08-git-workflow.md`, or stop and ask the lead. Other people edit the same shared files, so this can happen.

3. On GitHub:
    - in `erp-api` and `erp-web`, open your draft pull request and click **Ready for review**
    - in `erp-infra`, open a new pull request from `feat/departments`, with **base** `dev`
    - in each description, write what you changed, how you tested it, the last lines of `corepack yarn check`, screenshots of the screen, and the links to your other two pull requests

4. Tell the lead your three pull requests are ready. They review them; when approved, they are merged into `dev` with **Rebase and merge**. Moving `dev` to `main` is the lead's job, not yours.

**Never push to `main` or `dev` directly, and never use `git merge`.** All work goes through your branch and pull requests.

## References to read (not to copy)

- **The module you extend:** `erp-api/src/v1/departments` (its README first).
- **How write routes, rules and tests fit together:** Cost Centers (`erp-api/src/v1/cost-centers`, `erp-web/src/features/cost-centers`).
- **Who depends on your module:** `erp-api/src/v1/identity` (the Staff screen). Search for `DepartmentsFacade` there.
- **Every part explained, file by file:** `erp-docs/01-onboarding/02-first-feature.md`, with `erp-api/src/v1/auth` and `erp-web/src/features/auth` open beside it.
- **Empty skeletons of a module and a feature:** `erp-docs/05-templates/`.
- **Naming, branches, commits and response shapes:** `erp-docs/CONVENTIONS.md`.

## Shared files you edit (add only your own lines, don't change other people's)

- `erp-api/prisma/ownership.json`
- `erp-api/src/shared/db/__tests__/ownership-guard.spec.ts`
- `erp-api/packages/contracts/src/route-gates.ts`
- `erp-web/src/config/route-gates.ts`
- `erp-web/src/config/navigation.ts`
- `erp-web/src/messages/index.ts`
- `erp-infra/nginx/local/default.conf`

## Done means

- Signed in as an admin, Setup > Support > Departments opens your new page. Add, edit and delete all work.
- Deleting a department that a ticket, a staff member or a child department uses is refused, with a clear message.
- The Staff screen still works: its department picker shows your new and changed departments, and the identity tests pass.
- The mailbox columns are never returned by the API, and your README says how mailbox settings are edited now.
- Signed in as a non-admin, you can't open the page.
- Opening http://localhost:8088/admin/departments takes you to your new page.
- In the browser (F12 → Network tab), your page shows `X-Erp-Route: web` and your API calls show `X-Erp-Route: api`.
- No text is typed directly in components; it all comes from the message files.
- The screen uses the shared components (`ListPageTemplate`, `SchemaForm`, `SearchableSelect` and so on), not hand-built tables, forms or dialogs, and your list and form have Storybook stories.
- `corepack yarn check` passes in `erp-api` and in `erp-web` (in `erp-web`, everything before the known dependency audit), and `corepack yarn test:int` passes.
- Both READMEs are updated, and your three pull requests into `dev` link to each other.
