# Team tasks: one screen per person

Each card below moves one Perfex screen to Node. The screens don't depend on each other, so everyone can work at the same time. Each card is complete on its own: read [`00-start-here.md`](00-start-here.md) first, then your card from top to bottom, and follow it in order.

| # | Screen | Menu | Node page | Level | Time | Assigned to |
|---|---|---|---|---|---|---|
| 01 | [Ticket Priority](01-ticket-priorities.md) | Setup > Support > Ticket Priority | `/setup/ticket-priorities` | Easy | 3–4 days | |
| 02 | [Services (tickets)](02-services.md) | Setup > Support > Services | `/setup/services` | Easy | 3–4 days | |
| 03 | [Customer Groups](03-customer-groups.md) | Setup > Customers > Groups | `/setup/customer-groups` | Easy | 3–4 days | |
| 04 | [Contract Types](04-contract-types.md) | Setup > Contracts > Contract Types | `/setup/contract-types` | Easy | 3–4 days | |
| 05 | [Lead Sources](05-lead-sources.md) | Setup > Leads > Sources | `/setup/lead-sources` | Easy | 3–4 days | |
| 06 | [Ticket Statuses](06-ticket-statuses.md) | Setup > Support > Ticket Statuses | `/setup/ticket-statuses` | Easy+ | 4–5 days | |
| 07 | [Lead Statuses](07-lead-statuses.md) | Setup > Leads > Statuses | `/setup/lead-statuses` | Easy+ | 4–5 days | |
| 08 | [Predefined Replies](08-predefined-replies.md) | Setup > Support > Predefined Replies | `/setup/predefined-replies` | Medium | 5–6 days | |
| 09 | [Spam Filters](09-spam-filters.md) | Setup > Support > Spam Filters | `/setup/spam-filters` | Medium | 5–6 days | |
| 10 | [Departments](10-departments.md) | Setup > Support > Departments | `/setup/departments` | Hard | 6–8 days | |
| 11 | [Custom Fields](11-custom-fields.md) | Setup > Custom Fields | `/setup/custom-fields` | Hard | 8–10 days | |

## Before anyone starts

- Everyone finishes the setup in [`../README.md`](../README.md) and the one-time git setup in [`../02-coding-rules/08-git-workflow.md`](../02-coding-rules/08-git-workflow.md).
- Each task changes three repositories (`erp-api`, `erp-web`, `erp-infra`) on a branch called `feat/<screen>`, and opens three pull requests into **`dev`**. Moving `dev` to `main` is the lead's job.

## Working side by side

The screens are independent, but everyone adds a few lines to the same shared files:

- `erp-api/prisma/ownership.json` and `erp-api/src/shared/db/__tests__/ownership-guard.spec.ts`
- `erp-api/src/v1/v1.module.ts`
- `erp-api/packages/contracts/src/route-gates.ts` and `erp-web/src/config/route-gates.ts`
- `erp-web/src/config/navigation.ts`
- `erp-web/src/messages/index.ts`
- `erp-infra/nginx/local/default.conf`

So:

- Add only your own lines; never reorder or reformat someone else's.
- Run `git pull --rebase origin dev` before every push, so conflicts stay small.
- Pull requests are merged into `dev` one at a time. After each merge, everyone else rebases on the new `dev`.
- If a conflict is in someone else's lines, ask them or the lead. Don't guess.

## Two people on one screen

These screens are big enough to share. Each person still has their own branch:

- **Spam Filters:** one person builds the Tickets kind (and the backend), the other the Leads kind on the same API. The card explains the split.
- **Predefined Replies:** one person builds the rich-text editor and the HTML cleaning, the other the list, the form and the API.
- **Ticket Statuses** or **Lead Statuses:** if the UI kit has no colour picker, one person builds it as a shared component (with its story and test), the other the screen.
- **Departments** and **Custom Fields** are **Hard**: they add write routes to modules that already exist (Departments is used by the Staff screen). Give them to the strongest people, or to a pair: one builds the backend, the other the screen.
