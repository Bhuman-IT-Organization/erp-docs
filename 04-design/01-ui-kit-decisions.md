# Base UI kit — the decisions it builds on

Taken 2026-09-25 by the lead, answering the three questions left open by
the Wave 1 UI review. The lead's brief, verbatim, was
*"the one with less friction"* and *"UI should be simple and stupid"*. Where a decision
could be measured rather than argued, it was — see the evidence below each one.

These are not suggestions. A screen that departs from them records the departure and the
reason in its feature README, the same way a dropped field is recorded.

## 1. The permission picker is role-first

**Decision.** Choosing a role is the whole interaction for the common case. The Permissions
area shows what that role grants, grouped by module and collapsed, read-only, with a count.
A `Customise these permissions` toggle turns that same area into the editable grouped
accordion: modules collapsed, `3 of 7 granted` per module, search across all features,
select-all per module, a running total, and a `Reset to role` control.

There is no separate flat grid. The accordion **is** the customise surface.

**Evidence.** Measured against the client's production dump (counts only, read-only):

| non-admin staff carrying a role | 28 |
|---|---|
| hold exactly their role's permissions | 14 |
| within 1–2 pairs of their role | 11 |
| more than 2 pairs away | 3 |

89% of staff are their role, plus or minus two. 21 roles exist, 16 are in use; 296 distinct
`feature::capability` pairs are granted anywhere, against 542 declared in the catalogue. The
median staff member holds 23 grants — 23 checkboxes a grid asks someone to verify for an
answer the role already had.

**Flow parity is preserved, not bent.** Perfex already works this way: `tblroles.permissions`
is a serialised template that the staff form's JS copies into the checkboxes on role change,
and the stored truth is the per-staff rows in `tblstaff_permissions`. Role-first makes that
existing behaviour visible instead of implicit.

**A defect the data exposed, and what the kit does about it.** Nine of the 28 hold *fewer*
permissions than their role currently grants. Perfex copies the template at save time and
never propagates later edits, so a role that grew after assignment silently leaves its members
behind. The picker must therefore show, when a member's set is behind their role, a plain line
saying so with a `Re-apply role` action. This is a flow *addition*, justified by the data, and
belongs in the feature README's additions table.

## 2. Row actions: labelled icon buttons, kebab below the breakpoint

**Decision.** `RowActions` renders inline, labelled icon buttons in a trailing column at `md`
and above; below `md` it collapses to a single kebab whose menu items carry the same labels.
One component, one responsive rule, no per-screen choice.

- Neutral actions take the default foreground. Destructive actions take the destructive token
  and are set apart by a separator — never adjacent to a neutral action at the same weight.
- Every action carries a visible text label at `md`+ and an accessible name always. No
  icon-only controls (finding 4 was partly a naming problem, not only a colour one).
- Row click remains the primary "open" affordance; the trailing column never repeats it.

**Why not a kebab everywhere.** The daily action costs two clicks instead of one, on the
screens people live in. The lead chose inline; the breakpoint rule is what makes that safe on
a phone.

## 3. Forms: sectioned card, sticky save bar

**Decision.** `SchemaForm` renders named sections in a single card — no tabs, no wizard.

- Two-column grid for short fields (names, dates, codes, selects), full width for long ones
  (addresses, notes, email signatures). One column below `md`.
- Required fields marked; optional fields unmarked. Not the reverse.
- Rarely used fields live behind one disclosure per section, labelled and collapsed.
- Save and Cancel pinned to the bottom of the viewport, reachable without scrolling to the end.
- Validation errors appear at the field, and a summary names each failing field by label.

**Why not tabs or a wizard.** Tabs hide validation errors on panes you are not looking at, so
they need an error-bearing tab strip to be safe — complexity bought for nothing. A wizard adds
steps the legacy screen did not have, which is precisely the kind of flow departure FE-18
exists to prevent. The sectioned card is the least machinery that solves finding 6.

## What this makes buildable

With the three settled, the rest of the kit is mechanical:

| Component | Closes |
|---|---|
| `ListPageTemplate` — header, search, primary action, table, empty/loading/error states | 1, 4 |
| `RowActions` — the responsive rule above | 4 |
| `SchemaForm` + `FormSection` + `FieldGrid` + `DisclosureSection` | 6, 7 |
| `PermissionPicker` — role summary, customise toggle, grouped accordion, re-apply | 5 |
| `PasswordField` — reveal control with an accessible name | 9 |
| `AccountMenu` — one topbar control: identity, language, profile, sign out | 3 |
| `ConfirmDialog` — destructive confirmation, names the object | 4 |
| Session-aware `PermissionGate` — skeleton while unknown, refuse only when known-absent | 1 |

Still to reproduce before it can be fixed: the collapsed sidebar behaviour (finding 2). The
Direction field (finding 8) is a deletion, not a component.
