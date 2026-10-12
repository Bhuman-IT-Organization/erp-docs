# UI plan usability checklist

> Copy the block below, from its `##` heading to the last item, **verbatim** into every GSD plan whose frontmatter `files_modified` names an `erp-web/src/` or `erp-web/app/` path. The executor ticks each item **with evidence** (a test name or a Storybook screenshot path) in the plan's SUMMARY before the plan closes; an item the plan cannot affect is ticked "n/a — <reason>". The plan may add one sentence after the quoted line saying where its evidence goes. The checklist lives here, not in the GSD plan template, because that template is outside every repository.

## Usability checklist

> Copied verbatim from `04-design/02-ui-checklist.md`. The executor ticks each item **with evidence** (a test name or a Storybook screenshot path) in the plan's SUMMARY before it closes. An item the plan cannot affect is ticked "n/a — <reason>".

- [ ] **Required fields marked** — evidence: ______
- [ ] **Loading, empty and error states shown** — evidence: ______
- [ ] **No error, refusal or empty message appears while data is still loading** — "no access" only after the permissions have arrived, "sign in" only after the session is known to be absent, "no results" only after the list request has returned empty, an error only after the request has failed. A message shown during loading is a defect. — evidence: ______
- [ ] **The common case fits one viewport** — on a LIST page: the page's controls (search, primary action, pager) are reachable without scrolling; a form page keeps the one-viewport reading (lead decision 2026-09-26). — evidence: ______
- [ ] **Destructive actions confirmed and visually distinct** — evidence: ______
- [ ] **Works in Arabic RTL** — evidence: ______
- [ ] **Works at mobile width** — evidence: ______
- [ ] **While anything is loading, the screen shows a skeleton shaped like the content it is waiting for** (table rows for a list, labelled field blocks for a form, the sidebar's own shape for the menu), never a spinner on a blank page — evidence: ______
