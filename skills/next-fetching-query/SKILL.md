---
name: next-fetching-query
description: Fetch data in a Next.js App Router app the canonical way — server-component prefetch + TanStack Query hydration + client useQuery on the SAME key. Use when the user adds a data read, a list/table page, a server action that fetches, or a useQuery hook; says "fetch X", "load data for", "prefetch", "hydrate", "why does my query refetch on first paint", "table blanks when I search"; or hits a hydration mismatch or a double round-trip. Covers the fetching server action ('use cache' + cacheTag + cacheLife), prefetch in page.tsx with HydrationBoundary, client useQuery with isPending skeleton, typed API-client (Eden) call syntax, parallel queries, and keepPreviousData for filtered list tables. Pairs with `next-mutations` for writes + cache invalidation.
---

# Next.js + TanStack Query: fetching

Data flows server → client through one three-layer pattern: **server component prefetch → TanStack Query hydration → client `useQuery` on the identical key**.

```
page.tsx (dynamic server component)
  resolve scope (session/params) → e.g. orgSlug
    └─▶ queryClient.prefetchQuery   queryKey: [scope, "resource"]
          └─▶ server action  ('use cache' + cacheTag + cacheLife)
                └─▶ typed API client (Eden) → backend
                      └─▶ dehydrate(queryClient) into <HydrationBoundary>
                            │ serialized cache
                            ▼
  client component
    └─▶ useQuery  SAME queryKey + queryFn
          ├─ cache hydrated for this key? ─ yes ─▶ paint immediately, no refetch
          └─ no / stale ─▶ refetch via the same server action
          (always handle isPending → <Skeleton>)
```

**Read it as:** the server prefetches under a `queryKey` and hands the serialized cache to `<HydrationBoundary>`; the client `useQuery` uses the *identical* key + queryFn, finds the prefetched entry, and paints without a second round-trip. Scope (org/workspace/user) is resolved **once on the server** and passed down — server actions never read cookies/headers/session themselves.

> The `orgSlug` / `scope` segment below is for multi-tenant apps. If your app isn't scoped, drop it from the cache tag and query key.

## Rules

- `page.tsx` is a **dynamic server component** — no `'use cache'`, no `export const dynamic`. It reads the session/params and passes scope as an argument.
- **Fetching** server actions use `'use cache'` + `cacheTag` + `cacheLife`; they receive everything as arguments and **never** read cookies/headers/session internally.
- Client components read through `useQuery` calling the same server action — **never** call the API client directly from the client.
- Every `useQuery` **must** handle `isPending` and render a skeleton.
- Server actions never leak raw errors — catch, `log.error(...)`, return a human-readable `{ error }` string.

## Step 1 — fetching server action

```ts
// actions/things.ts
"use server";

import { cacheLife, cacheTag } from "next/cache";
import { log } from "@/lib/log";
import { createApi } from "@/lib/api"; // your typed client factory

export async function getThings(orgSlug: string) {
  "use cache";
  cacheTag(`${orgSlug}:things`); // tag format: "{scope}:{resource}"
  cacheLife("hours");            // presets: minutes | hours | days | weeks | max

  const api = createApi();
  const { data, error } = await api.things.get(); // GET /things

  if (error) {
    log.error({ action: "getThings", scope: orgSlug, error });
    return { error: "Failed to load things" };
  }
  return { data };
}
```

## Step 2 — prefetch in `page.tsx`

```tsx
import { headers } from "next/headers";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { auth } from "@/lib/auth";
import { getQueryClient } from "@/lib/query";
import { getThings } from "@/actions/things";
import { ThingTable } from "./_components/thing-table";

export default async function Page() {
  const { session } = await auth.api.getSession({ headers: await headers() });
  const orgSlug = session?.activeOrganizationId ?? "";

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [orgSlug, "things"],
    queryFn: () => getThings(orgSlug),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ThingTable orgSlug={orgSlug} />
    </HydrationBoundary>
  );
}
```

## Step 3 — consume in the client component

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { getThings } from "@/actions/things";

export function ThingTable({ orgSlug }: { orgSlug: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: [orgSlug, "things"], // identical key → reuses the prefetched cache
    queryFn: () => getThings(orgSlug),
  });

  if (error) throw error;
  if (isPending) return <ThingTableSkeleton />;
  return <DataTable data={data} />;
}
```

## Typed API client (Eden) call syntax

Get the client from a factory (`createApi()`), never a shared singleton.

```ts
const api = createApi();
const { data, error } = await api.things.get();
const { data, error } = await api.things.post(body);

// dynamic path params — use FUNCTION CALL syntax, never bracket notation
const { data } = await api.organizations({ id: orgId }).get();   // ✅ → /organizations/:id
// api.organizations[orgId].get()                                // ❌ wrong
const { data } = await api.things({ thingId }).logs({ logId }).get(); // nested params
```

**Server-only:** when calling the backend from a server component/action without a service key, forward the request cookie so the backend can verify the session:

```ts
const h = await headers();
const api = createApi({ cookie: h.get("cookie") ?? "" });
```

## Parallel queries — never `await` in a loop

Run independent reads concurrently with named results (e.g. `better-all`) or `Promise.all`:

```ts
const { rows, count } = await all({
  async rows() { return db.select().from(thing).where(filters); },
  async count() { return db.$count(thing, filters); },
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
updateTag(`${orgSlug}:things`); // matches the cacheTag in step 1
```

The full write pattern (server action throws → toast → `updateTag`, plus optimistic `useMutation`) lives in the **`next-mutations`** skill.
