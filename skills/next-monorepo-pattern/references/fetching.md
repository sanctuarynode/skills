# Fetching: server prefetch → hydration → client `useQuery`

Data flows server → client through one three-layer pattern: **server component prefetch → TanStack Query hydration → client `useQuery` on the identical key**.

```
page.tsx (dynamic server component)
  resolve scope (session/params) → e.g. orgSlug
    └─▶ queryClient.prefetchQuery   queryKey: [scope, "resource"]
          └─▶ lib/data function  ('use cache' + cacheTag + cacheLife)
                └─▶ typed API client (Eden) → backend
                      └─▶ dehydrate(queryClient) into <HydrationBoundary>
                            │ serialized cache
                            ▼
  client component
    └─▶ useQuery  SAME queryKey + queryFn
          ├─ cache hydrated for this key? ─ yes ─▶ paint immediately, no refetch
          └─ no / stale ─▶ refetch via the same lib/data function
          (always handle isPending → <Skeleton>)
```

**Read it as:** the server prefetches under a `queryKey` and hands the serialized cache to `<HydrationBoundary>`; the client `useQuery` uses the _identical_ key + queryFn, finds the prefetched entry, and paints without a second round-trip. Scope (org/workspace/user) is resolved **once on the server** and passed down — `lib/data` functions never read cookies/headers/session themselves.

> The `orgSlug` / `scope` segment below is for multi-tenant apps. If your app isn't scoped, drop it from the cache tag and query key.

## Rules

- `page.tsx` is a **dynamic server component** — no `'use cache'`, no `export const dynamic`. It reads the session/params and passes scope as an argument.
- Fetching lives in `lib/data/*.ts` (see the parent `SKILL.md` for the full file-placement convention).
- **Fetching** functions always use `'use cache'` + `cacheTag` + `cacheLife` — cache components is a required `next.config.ts` setting for this convention, not optional. They receive everything as arguments and **never** read cookies/headers/session internally.
- Client components read through `useQuery` calling the same `lib/data` function — **never** call the typed API client directly from the client.
- Every `useQuery` **must** handle `isPending` and render a skeleton.
- `lib/data` functions never leak raw errors — catch, `log.error(...)`, return a human-readable `{ error }` string.

The full worked files — [`fetching.ts`](../examples/fetching.ts), [`page.tsx`](../examples/page.tsx), [`table.tsx`](../examples/table.tsx) — are in [`../examples/`](../examples/) (each carries a `Place at:` comment with its real project path).

## Typed API client (Eden) call syntax

Import the typed client (`api`) from `@/lib/api` — the exact module shape is project-specific.

```ts
import { api } from "@/lib/api";

const { data, error } = await api.things.get();
const { data, error } = await api.things.post(body);

// dynamic path params — use FUNCTION CALL syntax, never bracket notation
const { data } = await api.organizations({ id: orgId }).get(); // ✅ → /organizations/:id
// api.organizations[orgId].get()                                // ❌ wrong
const { data } = await api.things({ thingId }).logs({ logId }).get(); // nested params
```

**Server-only:** when calling the backend from a server component/action without a service key, the client must forward the request cookie so the backend can verify the session. How that's wired (a per-request client, a header argument, etc.) is project-specific — check your `@/lib/api` setup.

## Parallel queries — never `await` in a loop

Run independent reads concurrently with named results (e.g. `better-all`) or `Promise.all`:

```ts
const { rows, count } = await all({
  async rows() {
    return db.select().from(thing).where(filters);
  },
  async count() {
    return db.$count(thing, filters);
  },
});

// fan-out over a collection
await Promise.all(items.map((item) => processItem(item)));
```

Awaiting inside a `for`/`while` serializes independent work — use `all()` or `Promise.all()`.

## Filtered list tables — `keepPreviousData`

A search/filter/sort/page change is just a **URL write** (e.g. `nuqs`, `shallow: true`) that changes the `queryKey`, which drives a client `useQuery` refetch:

```
type/filter/sort/page → URL write → queryKey changes → useQuery refetch
   placeholderData: keepPreviousData → previous rows stay on screen
   loading = isPending || isPlaceholderData → ONLY body rows become skeletons
   (toolbar, header row, pagination stay mounted and interactive)
```

```ts
const { data, isPending, isPlaceholderData } = useQuery({
  queryKey: ["things", page, limit, q, sortBy, sortDir, statusFilter],
  queryFn: () => listThings({ page, limit, q, sortBy, sortDir, status: statusFilter }),
  placeholderData: keepPreviousData,
});
const loading = isPending || isPlaceholderData;
```

Why: without `keepPreviousData`, every keystroke flips `isPending` and the table blanks — losing the user's place. With it, prior rows stay while the new params fetch; scope the skeleton to the **body rows only** and keep the toolbar/header/pagination mounted. Debounce the search input (~400 ms) so it refetches on pause, not per keystroke.

## Cache invalidation

Reads are invalidated by **writes**. After a successful mutation, invalidate the tag:

```ts
import { updateTag } from "next/cache";
updateTag(`${orgSlug}:things`); // matches the cacheTag the lib/data function uses
```

The full write pattern (server action throws → toast → `updateTag`, plus optimistic `useMutation`) is in [`mutations.md`](mutations.md).
