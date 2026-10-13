# Daily git workflow

This page shows you, step by step, how to use git in erp-api, erp-web and erp-infra. Branch names and commit types are in [`../CONVENTIONS.md`](../CONVENTIONS.md).

## Words you will see

| Word | What it means |
|---|---|
| **repository (repo)** | A project folder that git tracks, e.g. `erp-api`. |
| **commit** | A saved snapshot of your changes, with a short message saying what you did. |
| **branch** | Your own line of work. Changes on your branch do not affect anyone else until they are merged. |
| **`main`** | The released version. Nobody works on it directly. |
| **`dev`** | The shared branch where everyone's finished work is collected. Your work goes here first. |
| **origin** | The copy of the repository on GitHub. Your laptop has its own copy; `origin` is the one online. |
| **pull** | Download the newest changes from GitHub to your laptop. |
| **push** | Upload your commits from your laptop to GitHub. |
| **rebase** | Put your commits on top of the newest version of another branch, as if you had started your work just now. |
| **pull request (PR)** | A request on GitHub to add your branch's work to `dev`. Someone reviews it first. |

## The two rules

1. **You never work directly on `main` or `dev`.** You always make your own branch, do your work there, and then open a pull request into `dev`.
2. **You never merge. You always rebase.**
   - To get the newest changes, use `git pull --rebase`.
   - If you did the one-time setup below, a plain `git pull` already does the same thing.
   - Never use `git merge`. It creates a "merge commit", and our git hooks refuse it.

## 1. One-time setup (do this once on your laptop)

Copy and run these five lines:

```sh
git config --global pull.rebase true
git config --global merge.ff only
git config --global rebase.autoStash true
git config --global fetch.prune true
git config --global push.autoSetupRemote true
```

What each line does:

- `pull.rebase true`: `git pull` will always rebase, never merge.
- `merge.ff only`: git refuses to create merge commits.
- `rebase.autoStash true`: if you have unsaved changes, git keeps them safe while it rebases.
- `fetch.prune true`: branches deleted on GitHub also disappear from your laptop.
- `push.autoSetupRemote true`: the first `git push` on a new branch works without extra options.

`--global` means "for every repository on this laptop", so you only do this once.

## 2. Before you start a new task

Always start from the newest version of `dev`:

```sh
git checkout dev
git pull --rebase
git checkout -b feat/tax-export
```

What each part means:

- `git checkout dev`: go to the `dev` branch.
- `git pull --rebase`: download the newest `dev` from GitHub.
- `git checkout -b feat/tax-export`: make a new branch called `feat/tax-export` from where you are (`dev`), and go to it.
  - `-b` means "create a new branch".
  - `feat/tax-export` is the name. Replace it with your own, following [`../CONVENTIONS.md`](../CONVENTIONS.md): `feat/...` for a feature, `fix/...` for a bug, and so on.

**Short version:** go to `dev`, download the newest version, then make your own branch from it.

## 3. While you work

Save your work in small commits. One small step = one commit:

```sh
git add .
git commit -m "feat(taxes): add the export button"
```

What each part means:

- `git add .`: choose all your changed files for the next commit. The `.` means "everything in this folder".
- `git commit -m "..."`: save those changes as one commit.
  - `-m` means "here is the message".
  - The message follows `type(scope): what you did`. See [`../CONVENTIONS.md`](../CONVENTIONS.md).

Before each commit, check that nothing is broken. In the app you changed, run at least:

```sh
corepack yarn typecheck
corepack yarn test
```

You do **not** need to pull before every commit. Pull when you start a task (step 2) and before you push (step 4).

## 4. Before you push or open a pull request

While you were working, other people may have added their work to `dev`. Put your work on top of the newest `dev`:

```sh
git pull --rebase origin dev
corepack yarn check
git push --force-with-lease
```

What each part of `git pull --rebase origin dev` means:

- `git pull`: download changes from GitHub.
- `origin`: from the repository on GitHub.
- `dev`: the branch to get the changes from.
- `--rebase`: put your commits on top of those changes, without creating a merge commit.

**Why `origin dev`?** On your own branch, a plain `git pull` only downloads your own branch from GitHub. It does **not** bring in the new work on `dev`. Adding `origin dev` does.

What `git push --force-with-lease` means:

- `git push`: upload your branch to GitHub.
- `--force-with-lease`: a rebase changes your commits, so GitHub refuses a normal `git push`. This option uploads them anyway, but **only if nobody else changed your branch on GitHub** in the meantime. Only ever use it on **your own** branch.

The very first time you push a new branch, a plain `git push` is enough.

**Short version:** `git pull --rebase origin dev` updates your branch with the newest `dev`. Then check everything and push.

## 5. If git says there is a conflict

A conflict means you and someone else changed the same lines. Git stops and lists the files.

1. Open each file it lists. You will see something like this:
   ```text
   <<<<<<< HEAD
   the code that is already in dev
   =======
   your code
   >>>>>>> feat(taxes): add the export button
   ```
2. Decide which code is right (sometimes you need both). Keep it, and delete the three marker lines: `<<<<<<<`, `=======` and `>>>>>>>`.
3. Then run:
   ```sh
   git add <the file you fixed>
   git rebase --continue
   ```
   - `git add <file>`: tell git "I fixed this file". Replace `<the file you fixed>` with the real file name.
   - `git rebase --continue`: carry on with the rebase.

If you get lost and want everything back to how it was before:

```sh
git rebase --abort
```

- `--abort`: cancel the rebase completely. Nothing is lost.

**If you are not sure which code to keep, stop and ask. Do not guess.**

## 6. The pull request

1. On GitHub, open a pull request **from your branch into `dev`**. Check the **base** box says `dev`, not `main`.
2. **Title:** written like a commit message, e.g. `feat(taxes): export the list to Excel`.
3. **Description:** what you changed, why, how you tested it, and the last lines of `corepack yarn check`. For screen changes, add screenshots.
4. Keep it small: one task per pull request.
5. If the reviewer asks for changes: fix them on the same branch, commit, and `git push` again. The pull request updates by itself.
6. When it is approved, it is merged with **Rebase and merge**.

After it is merged, clean up:

```sh
git checkout dev
git pull --rebase
git branch -d feat/tax-export
```

- `git checkout dev`: go back to `dev`.
- `git pull --rebase`: download `dev`, which now includes your work.
- `git branch -d feat/tax-export`: delete your old branch from your laptop. `-d` means "delete".

**If git says the branch is "not fully merged":** this is normal with **Rebase and merge**. GitHub puts copies of your commits on `dev`, so your laptop does not recognise them as the same commits. First check on GitHub that your pull request really says **Merged**. Only then delete the branch with a capital `-D`:

```sh
git branch -D feat/tax-export
```

- `-D` means "delete even if git thinks it is not merged". Use it only after you have checked the pull request is merged, because it deletes the branch from your laptop for good.

## 7. Never do these

- **Never run `git merge`.** Use `git pull --rebase origin dev` to get the newest `dev`.
- **Never push to `main` or `dev` directly.** Always use a pull request.
- **Never use `git push --force`.** Use `git push --force-with-lease`, and only on your own branch.
- **Never use `--no-verify`.** It skips the checks that protect your commit.
- **Never run `git checkout -- <file>` or `git checkout .` unless you really want to lose your changes.** These throw away your unsaved work in those files, and it cannot be undone.
- **Never commit `.env` files or passwords.** And never change anything in `erp-legacy`.
- **If something looks wrong, stop and ask** before trying `git reset --hard` or deleting branches. Lost work can almost always be found again with `git reflog`.
