---
name: elysia-pattern
description: Scaffold a new Elysia + Drizzle + Zod backend module the canonical way — a service class, a routes file, and a one-line registration in the aggregator. Use when the user says "add a new module/resource/table to the backend", "create a service for X", "add CRUD endpoints for Y", or needs a new Elysia route group backed by a Drizzle service.
---

# Elysia module convention

A backend module is always three things: a **service class**, a **routes file**, and a **one-line registration** in the routes aggregator. This is the convention for an Elysia + Drizzle + Zod backend — keep every module the same shape so a reader who's seen one has seen them all.

```
src/modules/<name>/
  <name>.service.ts   # data access — Drizzle queries, one class
  <name>.routes.ts    # HTTP — Elysia instance, Zod body/response
src/modules/routes.ts # aggregator — one .use(<name>Routes)
```

Reach for the simplest existing module in the repo as your reference before inventing a new shape.

## File 1 — `<name>.service.ts`

One class, one method per operation. Expose an explicit `columns` map so you never leak internal fields, and wrap every mutation in a transaction so the write and any side effects commit together.

```ts
import { desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { <table> } from "../../db/schema";

import type { Insert<Name>, Select<Name>, Update<Name> } from "./<name>.schema";

export class <Name>Service {
  // only the columns exposed externally — never `select *`
  private static readonly columns = {
    id: <table>.id,
    name: <table>.name,
    createdAt: <table>.createdAt,
    updatedAt: <table>.updatedAt,
  };

  async list({ limit = 100, page = 1 }: { limit?: number; page?: number }) {
    return db
      .select(<Name>Service.columns)
      .from(<table>)
      .orderBy(desc(<table>.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getById(id: string): Promise<Select<Name> | undefined> {
    const [row] = await db
      .select(<Name>Service.columns)
      .from(<table>)
      .where(eq(<table>.id, id))
      .limit(1);
    return row;
  }

  async create(body: Insert<Name>): Promise<Select<Name> | undefined> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(<table>).values(body).returning(<Name>Service.columns);
      return row;
    });
  }

  async update(id: string, body: Update<Name>): Promise<Select<Name> | undefined> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(<table>)
        .set(body)
        .where(eq(<table>.id, id))
        .returning(<Name>Service.columns);
      return row;
    });
  }

  async remove(id: string): Promise<{ id: string } | undefined> {
    const [row] = await db.delete(<table>).where(eq(<table>.id, id)).returning({ id: <table>.id });
    return row;
  }
}
```

> **Scoped / multi-tenant projects:** if rows belong to an org, user, or workspace, put the scope filter in *one* place — a `scope(table, ...extra)` helper or a base class the service extends — and apply it to every `where`. Never hand-copy the same `eq(table.orgId, …)` into each method; that's how one forgotten filter leaks another tenant's data.

### State-transition methods (`/approve`, `/cancel`, `/confirm`, …)

Anything that flips a status field under concurrency must **lock the row first, then guard the precondition in JS** — not in the SQL `where`:

```ts
async approve(id: string): Promise<Select<Name> | undefined> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select(<Name>Service.columns)
      .from(<table>)
      .where(eq(<table>.id, id))
      .for("update")            // ← serializes concurrent transitions
      .limit(1);

    if (!current || current.status !== "pending") return undefined; // → 400/409 in the route

    const [updated] = await tx
      .update(<table>)
      .set({ status: "active", approvedAt: new Date() })
      .where(eq(<table>.id, id))
      .returning(<Name>Service.columns);
    return updated;
  });
}
```

`.for("update")` is what stops two requests both passing the status check and both succeeding. Keep the check in JS (not `eq(<table>.status, "pending")` baked into the `where`) so the precondition is explicit and `current` is the locked snapshot you can report on.

## File 2 — `<name>.routes.ts`

```ts
import Elysia from "elysia";
import { httpExceptionPlugin, InternalServerErrorException } from "elysia-http-exception";
import z from "zod";

import { create<Name>Schema, select<Name>Schema, update<Name>Schema } from "./<name>.schema";
import { baseQuerySchema, paginationResponseSchema } from "../../lib/schema";
import { <Name>Service } from "./<name>.service";

export const <name>Routes = new Elysia({ name: "<name>", prefix: "/<name>s", tags: ["<Name>"] })
  .use(httpExceptionPlugin())             // ← maps thrown exceptions to the right HTTP status
  .model({ <Name>: select<Name>Schema })  // ← keeps typed-client inference working
  .resolve(() => ({ service: new <Name>Service() }))
  .get(
    "",
    async ({ query, status, service }) => {
      const { page = 1, limit = 100 } = query;
      const data = await service.list({ page, limit });
      return status(200, { data, pagination: { currentPage: page, limit } });
    },
    {
      query: baseQuerySchema,
      response: {
        200: z.object({ data: z.array(select<Name>Schema), pagination: paginationResponseSchema }),
      },
    },
  )
  .post(
    "",
    async ({ body, status, service }) => {
      const data = await service.create(body);
      if (!data) throw new InternalServerErrorException("Failed to create <name>");
      return status(201, data);
    },
    { body: create<Name>Schema, response: { 201: select<Name>Schema } },
  )
  .group("/:id", { params: z.object({ id: z.string() }) }, (app) =>
    app
      .get("", /* getById → throw NotFoundException if missing */)
      .patch("", /* update */)
      .delete("", /* remove */)
      // state transitions live here too: .post("/approve", ...)
  );
```

## File 3 — register in `src/modules/routes.ts`

```ts
import { <name>Routes } from "./<name>/<name>.routes";

// inside the chain:
.use(<name>Routes)
```

**Order matters:** mount **public routes before authed ones**. An auth plugin that uses `.guard({ as: "global" })` propagates its guard downward to every sibling registered *after* it — so a public route mounted after an authed sibling starts demanding auth. See the `elysia-zod` skill, case 5.

## Naming conventions

- Folder + file: `kebab-case` (`purchase-order/purchase-order.routes.ts`)
- Service class: `PascalCase` ending in `Service` (`PurchaseOrderService`)
- Exported routes: `<name>Routes` (`purchaseOrderRoutes`)
- Path prefix: plural (`/purchase-orders`)
- Zod schemas: `create<Name>Schema`, `select<Name>Schema`, `update<Name>Schema`

## Common pitfalls

- **No `.use(httpExceptionPlugin())`** → a thrown `NotFoundException` etc. surfaces as 500 instead of the intended status.
- **No `.model({...})`** → typed-client (e.g. Eden Treaty) inference breaks for body/response shapes.
- **Wrapping `.resolve()` inside a `.guard()` an auth plugin already set globally** → double-guard / scope leak (`elysia-zod` case 5).
- **Returning a raw `delete` result that's already `null`** → return `{ id }` against an explicit delete-response schema.

## After scaffolding

1. Typecheck — the generated client/contract package (Eden, OpenAPI types) is the canary.
2. Add an e2e test for the new endpoints.
