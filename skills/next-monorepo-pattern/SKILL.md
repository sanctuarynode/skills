---
name: next-monorepo-pattern
description: Use when working in a Next.js App Router monorepo with a shared packages/ui — adding a route/page, a data fetch or mutation, a form or dialog, a list/table component, or deciding where a component/hook/util belongs. Use when the user says "fetch X", "load data for", "prefetch", "hydrate", "table blanks when I search", "mutate", "submit form", "optimistic update", "toast on success", "invalidate cache after a write", "rollback on error", or asks where a component/hook/util/page should live, whether something is server or client, or whether a form should be role-specific.
---

# Next.js monorepo: structure, fetching, and mutations

One Next.js app's file layout, the priority order for deciding where a component/hook/util belongs relative to the monorepo's shared `packages/ui`, and the canonical read/write data pattern. Every app in the monorepo follows this same shape.

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
│  ├─ data/*.ts                    fetching — "use cache" + cacheTag + cacheLife
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

See [`examples/`](examples/) for a complete worked resource — fetching, the route, and this exact dialog/form split — real files to copy the shape from (each carries a `Place at:` comment with its real path): [`create-dialog.tsx`](examples/create-dialog.tsx) wraps [`create-form.tsx`](examples/create-form.tsx).

## Lists and tables — same modularity as forms

If the exact same list/table UI is rendered on more than one route, it's generic — pull it out of `_components/` into `components/<resource>/table/<resource>.tsx` (or `.../list/...`). If it's genuinely one route's layout, it can stay in that route's `_components/` — see [`examples/table.tsx`](examples/table.tsx) for the route-local case.

## Fetching — server prefetch → hydration → client `useQuery`

Reads flow **server component prefetch → TanStack Query hydration → client `useQuery` on the identical key**. Fetching functions live in `lib/data/*.ts`, always use `"use cache"` + `cacheTag` + `cacheLife` (cache components is a required `next.config.ts` setting for this convention — see [`references/fetching.md`](references/fetching.md) if it isn't enabled yet), and never read cookies/headers/session directly.

Full pattern, rules, and gotchas (typed API client call syntax, parallel queries, `keepPreviousData` for filtered tables, cache invalidation): [`references/fetching.md`](references/fetching.md).
Worked files: [`fetching.ts`](examples/fetching.ts), [`page.tsx`](examples/page.tsx), [`table.tsx`](examples/table.tsx).

## Mutations — server action throws → toast

Writes are a **server action that throws on failure** (the thrown message becomes the toast), triggered from the client with `useTransition` (simple) or `useMutation` (optimistic, for cached lists), forms via TanStack Form + Zod. Mutation functions live in `lib/action/*.ts` and call `updateTag` with the same tag the corresponding `lib/data` fetch uses.

Full pattern, rules, and variants (optimistic `useMutation`, the three list-write shapes, toast conventions, destructive actions): [`references/mutations.md`](references/mutations.md).
Worked files: [`mutation.ts`](examples/mutation.ts), [`create-form.tsx`](examples/create-form.tsx), [`create-dialog.tsx`](examples/create-dialog.tsx).

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
- Calling the typed API client directly from a client component instead of through a `lib/data`/`lib/action` function + `useQuery`/`useMutation`. → breaks hydration and cache invalidation.
- Looking for shared translation strings in `packages/`. → i18n has no shared tier; each app owns its own messages.
- Awaiting independent fetches in a `for`/`while` loop instead of `Promise.all`. → see [`references/fetching.md`](references/fetching.md).
