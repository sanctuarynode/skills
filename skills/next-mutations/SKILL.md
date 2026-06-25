---
name: next-mutations
description: Write data in a Next.js App Router app the canonical way — a server action that throws on failure, triggered from the client with useTransition (simple) or useMutation (optimistic), forms via TanStack Form + Zod, feedback via toast (Sonner). Use when the user adds a create/update/delete, a form + submit, says "mutate", "submit form", "optimistic update", "toast on success", "invalidate cache after a write", "rollback on error", or asks how to handle pending state or form validation. Covers the mutation server action (throw a human message, updateTag), useTransition vs useMutation, the Insert/Patch/Remove optimistic shapes + toggle variant + when NOT to, and TanStack Form + Zod field validation. Pairs with `next-fetching-query` for reads + cache tags.
---

# Next.js + TanStack Query: mutations & forms

Every write is two parts: a **server action that performs the write** and a **client trigger** that gives feedback via toast.

```
User submits
  └─▶ TanStack Form + Zod  validates onSubmit
        ├─ invalid ─▶ FieldError per field (no network call)
        └─ valid ───▶ pending (useTransition or useMutation)
              └─▶ server action  createThing(scope, body)
                    └─▶ typed API client (Eden) → backend
                          ├─ error ─▶ THROW human-readable message ─▶ catch → toast.error(message)
                          └─ ok ────▶ updateTag(scope:resource)  (invalidate cached reads)
                                        └─▶ toast.success → onSuccess?.() (close dialog)
```

**Read it as:** the form validates locally first, so an invalid submit never hits the network. A valid submit runs the server action, which **throws** a human message on failure (that string becomes the toast); on success it `updateTag`s the read cache and the client toasts + closes.

## Server action — throw on failure

Mutation actions **throw** (they don't return `{ error }` like fetching actions). The thrown message is the toast text. Keep debug context server-side; never send it to the client.

```ts
// actions/things.ts
"use server";

import { updateTag } from "next/cache";
import { createApi } from "@/lib/api";
import { log } from "@/lib/log";
import type { CreateThing } from "@/lib/schema";

export async function createThing(orgSlug: string, body: CreateThing) {
  const api = createApi();
  const { data, error } = await api.things.post(body);

  if (error) {
    log.error({ action: "createThing", scope: orgSlug, error }); // internal only
    throw new Error("Failed to create thing. Please try again.");  // → toast text
  }

  updateTag(`${orgSlug}:things`); // invalidate the read cache (see next-fetching-query)
  return data;
}
```

## Simple trigger — `useTransition`

For one-off mutations with no cached list to update, use React 19's `useTransition` for the pending flag (no provider, no `useState`).

```tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createThing } from "@/actions/things";

export function CreateThingButton({ orgSlug }: { orgSlug: string }) {
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      try {
        await createThing(orgSlug, { name: "New Thing" });
        toast.success("Thing created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return <Button onClick={handleCreate} disabled={isPending}>{isPending ? "Saving…" : "Create"}</Button>;
}
```

**Never `useState` for `isPending`** — `useTransition` gives you the pending state for free.

## Form — TanStack Form + Zod

Every form validates with Zod via TanStack Form; submit inside `startTransition`.

```tsx
"use client";

import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { createThing } from "@/actions/things";
import { createThingSchema } from "@/lib/schema";

export function CreateThingForm({ orgSlug, onSuccess }: { orgSlug: string; onSuccess?: () => void }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: createThingSchema },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        try {
          await createThing(orgSlug, value);
          toast.success("Thing created");
          onSuccess?.();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Something went wrong");
        }
      });
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="flex flex-col gap-4">
      <form.Field name="name">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
```

## Toast conventions (Sonner)

```ts
import { toast } from "sonner";

toast.loading("Saving…", { id: "op" });          // spinner
toast.success("Saved", { id: "op" });             // replace the same toast
toast.error("Failed to save", { id: "op" });      // replace with error
toast.error("Failed to create", { description: err.message }); // supplementary detail
```

Pass an `id` to update/replace a loading toast in place.

## Optimistic updates — `useMutation`

When a mutation touches a **cached list query**, prefer `useMutation` with `onMutate`/`onError`/`onSettled` over `useTransition`. The row appears (and the dialog closes) *before* the network finishes; on failure you roll back to the pre-mutation snapshot.

```
mutation.mutate(value)
  └─▶ onMutate (before network)
        └─▶ cancelQueries   stop in-flight refetch
              └─▶ getQueriesData   snapshot ALL page/limit/filter variants
                    └─▶ write optimistic change (Insert | Patch | Remove)
                          └─▶ return { snapshots } as rollback context
  server result
    ├─ error ───▶ onError    restore every snapshot + toast.error
    └─ success ─▶ onSuccess  toast + form.reset + close
  onSettled (either way) ─▶ invalidateQueries  refetch authoritative data
```

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
const KEY = ["things"] as const;

const mutation = useMutation({
  mutationFn: (value: ThingValues) => createThing(orgSlug, value),
  onMutate: async (value) => {
    await queryClient.cancelQueries({ queryKey: KEY });           // 1. stop competing refetch
    const snapshots = queryClient.getQueriesData({ queryKey: KEY }); // 2. snapshot EVERY variant
    const optimisticRow = { id: `optimistic-${value.name}`, ...value }; // 3. write the change
    for (const [key, data] of snapshots) {
      if (!data) continue;
      queryClient.setQueryData(key, {
        ...data,
        data: [optimisticRow, ...data.data],
        pagination: { ...data.pagination, totalItems: data.pagination.totalItems + 1 },
      });
    }
    return { snapshots };                                          // 4. rollback context
  },
  onError: (error, _value, ctx) => {
    ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    toast.error(error instanceof Error ? error.message : "Something went wrong");
  },
  onSuccess: () => { toast.success("Saved"); form.reset(); onOpenChange(false); },
  onSettled: () => void queryClient.invalidateQueries({ queryKey: KEY }),
});
```

**Rules:**
- The fake `id` (`optimistic-…`) just keeps the row unique for React's key — `onSettled`'s refetch replaces it with the real server id.
- Use **`getQueriesData` (plural)** — a paginated list has many cache entries (different `page`/`limit`/filter suffixes under one key prefix). Snapshot and write **all** of them so the change shows whatever page/filter the user is on, and rollback restores every one. (For a single non-paginated query, use singular `getQueryData`/`setQueryData`.)
- `onSettled` runs after success **and** error, so invalidation always happens — don't also call it from `onSuccess`.
- `mutation.isPending` is the button's pending flag. Don't combine with `useTransition`, and don't use `useState` — pick `useMutation`'s flag.
- Match a row by its stable key — usually `id`, but match whatever the model uses.

### The three list shapes

Same `onMutate`/`onError`/`onSettled` skeleton; only the cache write differs.

```ts
// Insert (create) — prepend + bump total
data: [optimisticRow, ...prev.data],
pagination: { ...prev.pagination, totalItems: prev.pagination.totalItems + 1 },

// Patch (edit / toggle / change-status) — map the matching row, total unchanged
data: prev.data.map((r) => (r.id === target.id ? { ...r, ...changed } : r)),

// Remove (delete / revoke) — filter out + decrement (clamp at 0)
const next = prev.data.filter((r) => r.id !== target.id);
pagination: { ...prev.pagination, totalItems: Math.max(0, prev.pagination.totalItems - (prev.data.length - next.length)) },
```

### Toggle variant — authoritative `onSuccess`, no refetch

When the server action **returns the full new object** (e.g. a settings toggle echoing the whole record), skip the `onSettled` invalidate and write the returned object in `onSuccess` — it's already the source of truth, so an extra GET is wasted. Still do the optimistic `onMutate` + `onError` rollback.

```ts
onSuccess: (next) => queryClient.setQueryData(KEY, next),
// (no onSettled invalidate)
```

### When NOT to use optimistic updates

- **Single-record edits where the form *is* the data** (a profile panel) — no list to roll back; just refetch/echo on success.
- **Server-derived values you can't guess** — e.g. create-api-key, where the server mints the id/prefix/one-time secret the dialog must show. Invalidate on success instead.
- **Provider-level switches** (locale/theme) — these re-render from a provider, not a cached list.
- **Mutations that may take >2s** — show a real loading state instead of faking instant success.

## Destructive actions

Wrap delete/revoke behind a confirmation dialog before calling the server action. Then apply the **Remove** shape above (or a plain invalidate if the list isn't optimistic).
