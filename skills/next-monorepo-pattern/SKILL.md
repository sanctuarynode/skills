---
name: next-monorepo-pattern
description: Use when adding a Next.js App Router route/page, creating a form or dialog, building a list/table component, adding a data fetch or mutation, or deciding where a component/hook/util belongs in a Next.js monorepo with a shared packages/ui. Use when unsure whether something is a server or client component, whether a form should be role-specific or shared, or whether code belongs in packages/ui, an app's components/, or a route's _components/.
---

# Next.js monorepo: where things go

One Next.js app's file layout, and the priority order for deciding where a component, hook, or utility belongs relative to the monorepo's shared `packages/ui`. Every app in the monorepo follows this same shape.

```
apps/<app>/
├─ app/
│  └─ dashboard/
│     └─ invoices/                 (any routing depth — same rule at every level)
│        ├─ page.tsx               server component — the route itself
│        ├─ _components/           client components used ONLY on this route
│        ├─ utils.ts               helper used ONLY on this route (optional)
│        └─ action.ts              server action used ONLY on this route (optional)
├─ components/                     generic components, shared across routes (this app)
│  ├─ <role>/<resource>/           role-specific form: create-invoice.tsx
│  └─ <resource>/table|list/       cross-role shared table/list: invoice-table.tsx
├─ hooks/                          generic hooks, shared across routes (this app)
├─ lib/
│  ├─ data/*.ts                    fetching — "use cache" only if cache components is on
│  ├─ action/*.ts                  mutations — throw on failure, updateTag on success
│  └─ utils.ts                     generic helpers, shared across routes (this app)
├─ i18n/                           translations — owned entirely by this app
├─ test/
│  ├─ unit/
│  └─ e2e/
├─ instrumentation.ts
└─ proxy.ts

packages/ui/                       shared across every app — ALWAYS check this first
```

## The rule

**`page.tsx` is always a server component.** If a route needs interactivity, the client piece goes in `_components/` at the same level as that `page.tsx` — never inline `"use client"` in `page.tsx` itself. This applies at every routing depth, however deep.

## Priority chain — check in this order

Before creating a component, hook, or utility, search in this order and stop at the first place it already exists (or clearly belongs):

| Looking for... | 1. Check first | 2. Then (this app) | 3. Last resort (this route only) |
|---|---|---|---|
| Component | `packages/ui` | `components/` — includes `<role>/<resource>/` forms and `<resource>/table\|list/` | `_components/` |
| Hook | `packages/ui` | `hooks/` | co-located in `_components/` |
| Utility | `packages/ui` (its own utils) | `lib/utils.ts` (or `lib/<domain>.ts`) | `utils.ts` |

`i18n/` is the one exception — it has no shared tier. Every app owns its own `i18n/messages/<locale>.json`; don't look for translations in `packages/`.

A component, hook, or utility only drops to a lower tier once it's confirmed absent from every tier above it — never create locally first and "promote" later as the default habit.

## Forms — role-first by default

Forms don't live under a route's `_components/`, because the same form is often needed from more than one route.

- **Default: role-first.** `components/<role>/<resource>/<create|update|delete>-<resource>.tsx` — because the same resource frequently has different fields per role.
- **Move to resource-first only when the fields are identical across every role that uses it:** `components/<resource>/<create|update|delete>-<resource>.tsx`.
- Every form component takes a `className` prop, so it renders correctly whether it's opened in a dialog or a full page.
- **Dialog wrapper is route-local.** If a route shows the form as a dialog, that wrapper lives at `_components/<dialog>-<create|update|delete>-<resource>.tsx` on that route — it renders the dialog shell and the shared form component inside it. The dialog wrapper is route-specific; the form it wraps is not.

```
app/dashboard/invoices/
  _components/dialog-create-invoice.tsx     <- route-local: opens the dialog, renders the form
components/admin/invoices/
  create-invoice.tsx                        <- shared: the actual form, takes `className`
```

## Lists and tables — same modularity as forms

If the exact same list/table UI is rendered on more than one route, it's generic — pull it out of `_components/` into `components/<resource>/table/<resource>.tsx` (or `.../list/...`). If it's genuinely one route's layout, it can stay in that route's `_components/`.

## Data: fetching and mutations

Fetching and mutations are split from UI entirely, and split from each other:

- **Fetching** → `lib/data/*.ts`. Use `"use cache"` + `cacheTag` + `cacheLife` **only if** `next.config.ts` has cache components enabled — check before adding these directives, don't assume they're always on.
- **Mutations** → `lib/action/*.ts`. Throw a human-readable error on failure; on success call `updateTag` with the same tag the corresponding `lib/data` fetch uses.
- Route-local `action.ts` (used by only one route) follows the same throw/updateTag contract — it's just not promoted to `lib/action/` because nothing else needs it.

For the full read/write implementation pattern (server-action shape, TanStack Query hydration, optimistic mutations, toast conventions), see `next-queries` and `next-mutations` — this skill only governs *where* that code lives, not how it's written.

## i18n, tests, telemetry, proxy

These are single, fixed locations at the app root, sibling to `app/`:

- `i18n/` — this app's translations (see `i18n-next-intl` for keeping locale files in sync)
- `test/unit/` and `test/e2e/`
- `instrumentation.ts` — telemetry setup
- `proxy.ts` — middleware/proxy

## Common mistakes

- Putting a `"use client"` directive directly in `page.tsx` instead of extracting to `_components/`. → `page.tsx` stays server; move the interactive part out.
- Building a form inside a route's `_components/` "for now." → Check whether another route needs the same resource form first; default to `components/<role>/<resource>/`.
- Reaching for `components/` before checking `packages/ui`. → `packages/ui` is shared across the whole monorepo; always check it first.
- Using `"use cache"` unconditionally. → It's only valid when cache components is enabled in `next.config.ts`.
- Looking for shared translation strings in `packages/`. → i18n has no shared tier; each app owns its own messages.
