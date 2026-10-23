# Task card: Predefined Replies

**Goal:** move Setup > Support > Predefined Replies from Perfex to Node. When you're done, the menu item opens your new Next.js screen at `/setup/predefined-replies` instead of the old Perfex page, and the old Perfex page can no longer change the data.

**Level:** Medium. Allow 4–5 days, including tests. The message (stored as HTML, edited as plain text) is the tricky part.

**Read first:** [`00-start-here.md`](00-start-here.md) explains the words on this card, how one screen moves from Perfex to Node, and how to ask for help.

**Before you start:** you must have finished the setup in the erp-docs `README.md` (the project runs at http://localhost:8088/login and you can sign in), and the one-time git setup in `erp-docs/02-coding-rules/08-git-workflow.md` (section 1). If not, do those first.

## How to read the commands on this card

- Everything inside a grey box is a command. Type it in the **Terminal** (Mac) or **Git Bash** (Windows), then press Enter.
- `cd <folder>` means "go into this folder". Git and yarn commands only work inside the right folder, so always run the `cd` line first.
- The project folder is called `erp`. This card assumes it is in your home folder (`~/erp`). If yours is somewhere else, use your path instead.
- Inside `erp` there are 5 folders, and **each one is its own git repository**: `erp-api` (backend), `erp-web` (frontend), `erp-infra` (Nginx and Docker), `erp-legacy` (the old Perfex app) and `erp-docs` (the guides).
- This task changes **three** of them: `erp-api`, `erp-web` and `erp-infra`. You make the same branch (`feat/predefined-replies`) in each of the three, and you open one pull request in each.
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

5. Create your branch `feat/predefined-replies` in each of the three repositories:

```sh
cd ~/erp/erp-api
git checkout -b feat/predefined-replies

cd ~/erp/erp-web
git checkout -b feat/predefined-replies

cd ~/erp/erp-infra
git checkout -b feat/predefined-replies
```

### Every next morning

Go back to your branch in each of the three repositories, and start the project in web dev mode:

```sh
cd ~/erp/erp-api
git checkout feat/predefined-replies

cd ~/erp/erp-web
git checkout feat/predefined-replies

cd ~/erp/erp-infra
git checkout feat/predefined-replies
node scripts/local-up.mjs --web-dev
```

Then, in a second terminal window:

```sh
cd ~/erp/erp-infra
node scripts/web-dev.mjs
```

Check which branch you are on with `git branch`. The one with `*` is the branch you are on. Do this in each repository if you are unsure.

## Step 1: Docs first (before any code)

1. **Claim the table.** Open `erp-api/prisma/ownership.json` in VS Code. Press Ctrl+F (Cmd+F on Mac) and search for `"tbltickets_predefined_replies"`. In that block:
    - change `"owner": "perfex-core"` to `"owner": "node"`
    - in `"note"`, write one sentence, for example: "Written by v1/predefined-replies; Perfex's delete is closed at Nginx; 'save as predefined reply' on a ticket stays on Perfex."

    Without this, the API refuses to save anything to this table. The rule is DB-02 in `erp-docs/02-coding-rules/07-database.md`.

2. **Update the test that lists the Node-owned tables.** A test pins the exact list, so after step 1 it fails until you add your table to it. Open `erp-api/src/shared/db/__tests__/ownership-guard.spec.ts`, press Ctrl+F and search for `names exactly the node-owned tables`. Below it:
    - in the list after `expect(nodeOwned).toEqual([`, add `'tbltickets_predefined_replies'`. The list is in **alphabetical order**, so put it in the right place, not at the end
    - in the comment lines above the list, add one line in the same style, for example: `// Predefined Replies claimed tbltickets_predefined_replies for v1/predefined-replies.`

    Then run the tests and check this one passes:

```sh
cd ~/erp/erp-api
corepack yarn test
```

3. **Create your module and feature from the templates.** Every new module and feature starts as a copy of the project's templates (rule BE-22 in `erp-docs/02-coding-rules/05-backend.md`). Copy them:

```sh
cd ~/erp/erp-api
cp -R ../erp-docs/05-templates/backend-module/src/v1/example-item src/v1/predefined-replies

cd ~/erp/erp-web
cp -R ../erp-docs/05-templates/frontend-feature/src/features/example-item src/features/predefined-replies
cp -R "../erp-docs/05-templates/frontend-feature/app/(shell)/example-item" "app/(shell)/setup/predefined-replies"
```

    Then rename the template's name to yours **everywhere** in `erp-api/src/v1/predefined-replies`, `erp-web/src/features/predefined-replies` and `erp-web/app/(shell)/setup/predefined-replies`: inside the files, and in the file names too. In VS Code use **Replace in Files** (Cmd+Shift+H on Mac, Ctrl+Shift+H on Windows) with **Match Case** on, and limit it to your folders ("files to include"). Rename the files with F2. Do the **plural ones first**, because `example_item` is part of `example_items`:

    | Replace | With |
    |---|---|
    | `example-items` | `predefined-replies` |
    | `ExampleItems` | `PredefinedReplies` |
    | `EXAMPLE_ITEMS` | `PREDEFINED_REPLIES` |
    | `exampleItems` | `predefinedReplies` |
    | `example_items` | `predefined_replies` |
    | `Example items` | `Predefined replies` |
    | `example items` | `predefined replies` |
    | `example-item` | `predefined-replies` |
    | `ExampleItem` | `PredefinedReplies` |
    | `EXAMPLE_ITEM` | `PREDEFINED_REPLIES` |
    | `exampleItem` | `predefinedReplies` |
    | `example_item` | `predefined_reply` |
    | `Example item` | `Predefined reply` |
    | `example item` | `predefined reply` |

    Your name is already plural, so the code spellings are the same for both rows; the text rows use the singular "predefined reply" where the template says one item. The two template READMEs (`erp-docs/05-templates/backend-module/README.md` and `frontend-feature/README.md`) explain every row. Don't forget the file names: some start with `ExampleItem` (for example `ExampleItemList.tsx` becomes `PredefinedRepliesList.tsx`). Then check nothing is left over. The `grep` lines look inside the files and the `find` lines look at the file names; **all of them must print nothing**:

```sh
cd ~/erp/erp-api
grep -rniE "example[-_ ]?item" src/v1/predefined-replies
find src/v1/predefined-replies -iname "*example*item*"

cd ~/erp/erp-web
grep -rniE "example[-_ ]?item" src/features/predefined-replies "app/(shell)/setup/predefined-replies"
find src/features/predefined-replies "app/(shell)/setup/predefined-replies" -iname "*example*item*"
```

4. **Write your backend README.** The template gave you `erp-api/src/v1/predefined-replies/README.md`. Rewrite it in plain words for your module: what the Perfex screen does, the rules you will keep (Step 2), the API routes you plan (for example `GET /api/v1/predefined-replies`), how the message is stored as HTML and read back as plain text, and anything you plan to leave out and why.

5. **Write your frontend README.** The template gave you `erp-web/src/features/predefined-replies/README.md`. Fill its sections (`Legacy screen`, `Legacy parity`, `Messages`, as its template README explains): the list columns, the form fields, and anything you plan to leave out.

6. Save your work and send it to GitHub, in both repositories:

```sh
cd ~/erp/erp-api
git add .
git commit -m "docs(predefined-replies): plan the screen"
git push

cd ~/erp/erp-web
git add .
git commit -m "docs(predefined-replies): plan the screen"
git push
```

7. Open a **draft pull request** in each of the two repositories:
    - go to https://github.com/Bhuman-IT-Organization/erp-api and https://github.com/Bhuman-IT-Organization/erp-web
    - click **Compare & pull request**
    - check that **base** says `dev`, not `main`
    - click the arrow next to **Create pull request**, choose **Create draft pull request**, and confirm

    Send both links to the lead and **wait for their OK** before you write code.

## Step 2: Read the Perfex screen (`erp-legacy`), and don't change it

**Never edit anything inside `erp-legacy`.** You only read it.

1. Open http://localhost:8088/admin/tickets/predefined_replies. Add a reply with bold text, a list and a link; edit it; delete it. Look at the editor toolbar too. Write down what you see: the buttons, the messages, the columns.
2. Open these files in VS Code and read them:
    - `erp-legacy/public_html/application/controllers/admin/Tickets.php`: search for `function predefined_replies`, `function predefined_reply` and `function delete_predefined_reply`
    - `erp-legacy/public_html/application/views/admin/tickets/predefined_replies/manage.php` (the list) and `reply.php` (the add/edit page with the editor)
    - `erp-legacy/public_html/application/models/Tickets_model.php`: search for `function delete_predefined_reply`
3. The table is `tbltickets_predefined_replies`. Its columns: `id` (a number), `name` (text, at most 191 characters) and `message` (HTML: Perfex saves what its rich-text editor produces, and inserts it into ticket replies).

**Rules your screen must keep, exactly like Perfex:**

- **Admins only:** only an administrator can open the page or save anything.
- **Delete checks nothing:** nothing else points at a predefined reply, so a delete always works.
- **The message: a plain text box on our screen, HTML in the table.** Perfex edits the message in a rich-text editor. Our screen uses a plain text box instead, the same choice the Email Templates screen made (see "Rich text" in `erp-web/src/features/mail/README.md`), so no HTML ever comes in and nothing needs a cleaning library. In the backend, put two functions in their own small file, `service/reply-html.ts`, and list it under "Layers" in your README:
-     - **Saving (text → HTML):** escape the five special characters (`&` `<` `>` `"` `'`), wrap each paragraph (separated by an empty line) in `<p>`, and turn the other line breaks into `<br>`. A typed `<script>` is then stored as harmless text (`&lt;script&gt;`), never as a tag.
-     - **Reading (HTML → text):** turn the stored HTML back into plain text for the text box, and return a flag (for example `hasOtherFormatting`) when an old Perfex reply has bold text, lists or links that editing would drop, so the screen can warn about it.
-     - Write in your README that our screen uses a plain text box instead of Perfex's rich editor, and why.
- **"Save as predefined reply" stays on Perfex:** when staff reply to a ticket, they can save the reply as a predefined reply. That stays on Perfex. Don't block it, and write it in your README.

## Step 3: Backend (`erp-api`)

1. Your module `erp-api/src/v1/predefined-replies` was created from the template in Step 1. Now read `erp-api/src/v1/cost-centers` to see what a **finished** module looks like: `controller`, `service`, `repository`, `facade`, `dto`, `model`, `events`. Read its README first, and the rules in `erp-docs/02-coding-rules/05-backend.md`. Cost Centers uses things your screen doesn't need. **Don't copy Cost Centers' files**: change your own copied skeleton step by step. The module-shape test and the architecture lint tell you if a part is missing or in the wrong place.
    - The template keeps its rows **in memory**. Replace that with your real table: your repository reads and writes it through Prisma (Cost Centers' repository shows how), and add a repository integration test (`predefined-replies.repository.int.spec.ts`), which every repository that reads the database needs (rule BE-21).
2. Register your module in `erp-api/src/v1/v1.module.ts`: add one import line and one line in the `imports` list.
3. Add your page permissions to `erp-api/packages/contracts/src/route-gates.ts`: `/setup/predefined-replies`, `/setup/predefined-replies/new` and `/setup/predefined-replies/:id`, all `ADMIN_GATE`.
4. Write tests while you build, not at the end. Look at `erp-api/src/v1/cost-centers/__tests__` to see what kinds of tests a module has. Include tests for `reply-html.ts`: a typed `<script>` is saved escaped (as text, never as a tag); paragraphs and line breaks survive a save and a read; an old reply with bold text, a list or a link sets the formatting flag.
5. Run the backend tests:

```sh
cd ~/erp/erp-api
corepack yarn test
```

The last lines must say `failed` 0 times.

6. Save your work in small commits as you go. One small step = one commit:

```sh
cd ~/erp/erp-api
git add .
git commit -m "feat(predefined-replies): add the list endpoint"
```

Change the message to say what you did. See `erp-docs/CONVENTIONS.md` for the format.

7. Rebuild the project so your API is live. The API (unlike the web app) is rebuilt each time you run this, which takes a minute or two:

```sh
cd ~/erp/erp-infra
node scripts/local-up.mjs --web-dev
```

Then open http://localhost:8088/api/v1/docs and find your routes. Try them with the **Try it out** button.

## Step 4: Frontend (`erp-web`)

1. **First, let Nginx send your page to the web app**, so you can open it while you build it. Open `erp-infra/nginx/local/default.conf`, press Ctrl+F and search for `location = /setup/cost-centers`. Below the two Cost Centers blocks (`location = /setup/cost-centers` and `location ^~ /setup/cost-centers/`), add the same two blocks for `/setup/predefined-replies`. [`00-start-here.md`](00-start-here.md) section 3 explains every line (blocks 3 and 4).

    Then restart Nginx so it reads the change, and commit:

```sh
cd ~/erp/erp-infra
docker compose -f compose/local.yml restart nginx
git add .
git commit -m "feat(nginx): send /setup/predefined-replies to web"
```

    Open http://localhost:8088/setup/predefined-replies. A "page not found" from the **new** app (not Perfex) means it worked: the page exists once you create it in item 4. If the page does not load at all, Nginx did not start: run `docker compose -f compose/local.yml logs nginx` in `erp-infra` to see the error.

2. **Before you write any frontend code, find what already exists.** Start Storybook in a third terminal window:

```sh
cd ~/erp/erp-web
corepack yarn storybook
```

Open http://localhost:6006. On the left you see every shared component, grouped as **atoms**, **molecules**, **organisms** and **templates**. Click through them and read their **Docs** tab. For a screen like yours, you will almost certainly use:

- `ListPageTemplate`: the whole list page (title, table, search, add button)
- `SchemaForm`: the add and edit form
- `ConfirmDialog`: the "are you sure you want to delete?" box
- `PageSkeleton`: the grey loading placeholder
- `InlineError`: an error message under a field

**Rule:** if a component exists, use it. Never build your own table, form, button or dialog. If you really need something that doesn't exist, **ask the lead first**. A new shared component goes in `erp-web/src/components`, with its own story and test, so the next person can reuse it. See also `erp-docs/04-design/01-ui-kit-decisions.md`.

3. Your feature `erp-web/src/features/predefined-replies` was created from the template in Step 1. Read `erp-web/src/features/cost-centers` to see what a **finished** screen looks like: `api`, `components`, `hooks`, `pages`, `schemas`, `messages`. Read the rules in `erp-docs/02-coding-rules/06-frontend.md`. **Don't copy Cost Centers' files**: turn your copied skeleton into your screen.
4. Your pages, copied in Step 1, are in `erp-web/app/(shell)/setup/predefined-replies/`:
    - `page.tsx`: the list
    - `new/page.tsx`: the add form
    - `[id]/page.tsx`: the edit form
    - `error.tsx`: what shows if something breaks

    With web dev mode running, open http://localhost:8088/setup/predefined-replies after each save to see your change.

5. Put every text the user sees in `messages/en.json` (English) and `messages/ar.json` (Arabic) inside your feature folder. Never type text directly in the component. Then register both files in `erp-web/src/messages/index.ts`.
6. Add the same page permissions to `erp-web/src/config/route-gates.ts`. They must match the backend file exactly.
7. Make the menu open your page. In `erp-web/src/config/navigation.ts`, find `id: 'tickets-predefined-replies'` and:
    - change `href` to `'/setup/predefined-replies'`
    - replace the `adminOnly` / `permission` line with `...navGateOf('/setup/predefined-replies'),`
    - delete the `legacy: true,` line
8. Write a test and a Storybook story for your list and your form (files ending in `.test.tsx` and `.stories.tsx`). Make a story that shows the warning for an old reply that has formatting.
9. Run the frontend tests, then commit:

```sh
cd ~/erp/erp-web
corepack yarn test
git add .
git commit -m "feat(predefined-replies): add the list page"
```

10. Before you call the screen finished, go through the checklist in `erp-docs/04-design/02-ui-checklist.md`.

## Step 5: Infra (`erp-infra`)

1. Open `erp-infra/nginx/local/default.conf`. Search for `W2A-03` (the Cost Centers section) and read it to see how a screen moves from Perfex to Node. `erp-docs/03-architecture/05-strangler-fig-migration.md` explains why.
2. Next to the two blocks you added in Step 4, add the rest of your section:
    - refuses Perfex's `/admin/tickets/delete_predefined_reply` address, for every method
    - redirects `/admin/tickets/predefined_replies` to `/setup/predefined-replies`

    **Don't** block the ticket's "save as predefined reply".
3. Restart Nginx so it reads your change, and commit:

```sh
cd ~/erp/erp-infra
docker compose -f compose/local.yml restart nginx
git add .
git commit -m "feat(nginx): close the Perfex Predefined Replies screen"
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
    - in `erp-infra`, open a new pull request from `feat/predefined-replies`, with **base** `dev`
    - in each description, write what you changed, how you tested it, the last lines of `corepack yarn check`, screenshots of the screen, and the links to your other two pull requests

4. Tell the lead your three pull requests are ready. They review them; when approved, they are merged into `dev` with **Rebase and merge**. Moving `dev` to `main` is the lead's job, not yours.

**Never push to `main` or `dev` directly, and never use `git merge`.** All work goes through your branch and pull requests.

## References to read (not to copy)

- **How the parts fit:** Cost Centers (`erp-api/src/v1/cost-centers`, `erp-web/src/features/cost-centers`).
- **The same plain-text choice:** Email Templates (`erp-web/src/features/mail/README.md`, "Rich text").
- **Every part explained, file by file:** `erp-docs/01-onboarding/02-first-feature.md`, with `erp-api/src/v1/auth` and `erp-web/src/features/auth` open beside it.
- **Where every module and feature starts:** `erp-docs/05-templates/` (rule BE-22); its two READMEs explain every name to rename.
- **Naming, branches, commits and response shapes:** `erp-docs/CONVENTIONS.md`.

## Shared files you edit (add only your own lines, don't change other people's)

- `erp-api/prisma/ownership.json`
- `erp-api/src/shared/db/__tests__/ownership-guard.spec.ts`
- `erp-api/src/v1/v1.module.ts`
- `erp-api/packages/contracts/src/route-gates.ts`
- `erp-web/src/config/route-gates.ts`
- `erp-web/src/config/navigation.ts`
- `erp-web/src/messages/index.ts`
- `erp-infra/nginx/local/default.conf`

## Done means

- Signed in as an admin, Setup > Support > Predefined Replies opens your new page. Add, edit and delete all work, and paragraphs and line breaks are kept.
- A typed `<script>` is saved and shown as plain text, and never runs.
- An old Perfex reply with bold text, a list or a link shows the formatting warning.
- A reply you save in Node shows correctly when you insert it into a ticket reply on Perfex.
- "Save as predefined reply" on a Perfex ticket still works.
- Signed in as a non-admin, you can't open the page.
- Opening http://localhost:8088/admin/tickets/predefined_replies takes you to your new page.
- In the browser (F12 → Network tab), your page shows `X-Erp-Route: web` and your API calls show `X-Erp-Route: api`.
- No text is typed directly in components; it all comes from the message files.
- The screen uses the shared components (`ListPageTemplate`, `SchemaForm`, `ConfirmDialog` and so on), not hand-built tables, forms or dialogs, and your list and form have Storybook stories.
- `corepack yarn check` passes in `erp-api` and in `erp-web` (in `erp-web`, everything before the known dependency audit), and `corepack yarn test:int` passes.
- Both READMEs are updated, and your three pull requests into `dev` link to each other.
