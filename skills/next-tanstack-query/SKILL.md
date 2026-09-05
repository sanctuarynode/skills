---
name: next-tanstack-query
description: Use when reading or writing data in a Next.js App Router app with TanStack Query — a data fetch or mutation, prefetching for a route, hydrating a client query, a form or dialog that submits, an optimistic update, or cache invalidation after a write. Use when the user says "fetch X", "load data for", "prefetch", "hydrate", "table blanks when I search", "mutate", "submit form", "optimistic update", "toast on success", "invalidate cache after a write", or "rollback on error".
---

# Next.js + TanStack Query: reads and writes

The canonical read/write data pattern for a Next.js App Router app: reads flow server prefetch → hydration → client `useQuery`; writes are a server action that throws, triggered client-side with `useTransition` or optimistic `useMutation`. Fetching functions live in `lib/data/*.ts`, mutation functions in `lib/action/*.ts` — see `next-monorepo-pattern` for the full app file-layout convention these fit into.

## Fetching — server prefetch → hydration → client `useQuery`

Reads flow **server component prefetch → TanStack Query hydration → client `useQuery` on the identical key**. Fetching functions always use `"use cache"` + `cacheTag` + `cacheLife` (cache components is a required `next.config.ts` setting for this convention — see [`references/fetching.md`](references/fetching.md) if it isn't enabled yet), and never read cookies/headers/session directly.

Full pattern, rules, and gotchas (typed API client call syntax, parallel queries, `keepPreviousData` for filtered tables, cache invalidation): [`references/fetching.md`](references/fetching.md).
Worked files: [`fetching.ts`](examples/fetching.ts), [`page.tsx`](examples/page.tsx), [`table.tsx`](examples/table.tsx).

## Mutations — server action throws → toast

Writes are a **server action that throws on failure** (the thrown message becomes the toast), triggered from the client with `useTransition` (simple) or `useMutation` (optimistic, for cached lists), forms via TanStack Form + Zod. Mutation functions call `updateTag` with the same tag the corresponding `lib/data` fetch uses.

Full pattern, rules, and variants (optimistic `useMutation`, the three list-write shapes, toast conventions, destructive actions): [`references/mutations.md`](references/mutations.md).
Worked files: [`mutation.ts`](examples/mutation.ts), [`create-form.tsx`](examples/create-form.tsx), [`create-dialog.tsx`](examples/create-dialog.tsx).

## Common mistakes

- Calling the typed API client directly from a client component instead of through a `lib/data`/`lib/action` function + `useQuery`/`useMutation`. → breaks hydration and cache invalidation.
- Awaiting independent fetches in a `for`/`while` loop instead of `Promise.all`. → see [`references/fetching.md`](references/fetching.md).
- Using `useState` for a mutation's pending flag instead of `useTransition` or `useMutation`'s own `isPending`.
- Forgetting `keepPreviousData` on a filtered/paginated list query — every keystroke blanks the table instead of keeping prior rows visible.
