---
name: elysia-pattern
description: Scaffold a new Elysia + Drizzle + Zod backend module the canonical way — a Repository/Policy/Service trio, a routes file, and a one-line registration in the aggregator. Use when the user says "add a new module/resource/table to the backend", "create a service for X", "add CRUD endpoints for Y", or needs a new Elysia route group backed by a Drizzle service.
---

# Elysia module convention

A backend module is always the **Repository/Policy/Service trio**, a **routes file**, and a **one-line registration** in the routes aggregator. This is the convention for an Elysia + Drizzle + Zod backend — keep every module the same shape so a reader who's seen one has seen them all.

```
src/modules/<name>/
  <name>.repo.ts       # raw, scoped Drizzle access — NOT imported by <name>.routes.ts
  <name>.policy.ts     # pure RBAC decisions — no DB, unit-testable with a bare role string
  <name>.service.ts    # composes Repo + Policy; the only layer routes call
  <name>.routes.ts     # HTTP — Elysia instance, Zod body/response
src/modules/routes.ts  # aggregator — one .use(<name>Routes)
```

Reach for the simplest existing module in the repo as your reference before inventing a new shape. If the repo has none yet, [`examples/widget/`](examples/widget/) is a complete, concrete module — real names, the `/:id` group fully wired, one state transition, and a worked multi-tenant Repo — to copy the shape from.

**Not every module needs the full split.** Read-heavy modules with no real per-role decision — already gated by their mount point (e.g. only ever called from an admin-gated router) or self-gated via an internal-secret header — can skip straight to a plain service, no Repo/Policy files. Don't force the split onto a module that has nothing to decide; that's needless indirection, not rigor.

## File 1 — `<name>.repo.ts`

Raw, scoped Drizzle access. No auth, no business logic. Expose an explicit `returnableColumns` map so you never leak internal fields.

```ts
import { desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { <table> } from "../../db/schema";

import type { Tx } from "../../lib/tx";
import type { Insert<Name>, Select<Name> } from "./<name>.schema";

/** Raw, scoped Drizzle access. No auth. NOT imported by <name>.routes.ts. */
export class <Name>Repo {
  static readonly returnableColumns = {
    id: <table>.id,
    name: <table>.name,
    createdAt: <table>.createdAt,
    updatedAt: <table>.updatedAt,
  };

  async findMany({ limit = 100, page = 1 }: { limit?: number; page?: number }) {
    return db
      .select(<Name>Repo.returnableColumns)
      .from(<table>)
      .orderBy(desc(<table>.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async findById(id: string): Promise<Select<Name> | undefined> {
    const [row] = await db
      .select(<Name>Repo.returnableColumns)
      .from(<table>)
      .where(eq(<table>.id, id))
      .limit(1);
    return row;
  }

  async lockForUpdate(tx: Tx, id: string) {
    const [row] = await tx
      .select(<Name>Repo.returnableColumns)
      .from(<table>)
      .where(eq(<table>.id, id))
      .for("update"); // ← serializes concurrent state-transition writes
    return row;
  }

  async insert(tx: Tx, body: Insert<Name>) {
    const [row] = await tx.insert(<table>).values(body).returning(<Name>Repo.returnableColumns);
    return row;
  }

  async update(tx: Tx, id: string, body: Partial<Insert<Name>>) {
    const [row] = await tx
      .update(<table>)
      .set(body)
      .where(eq(<table>.id, id))
      .returning(<Name>Repo.returnableColumns);
    return row;
  }

  async remove(tx: Tx, id: string) {
    const [row] = await tx.delete(<table>).where(eq(<table>.id, id)).returning({ id: <table>.id });
    return row;
  }
}
```

> **Scoped / multi-tenant projects:** if rows belong to an org, user, or workspace, put the scope filter in _one_ place inside the Repo — a `scope(table, ...extra)` helper or a base class the Repo extends — and apply it to every query. Never hand-copy the same `eq(table.orgId, …)` into each method; that's how one forgotten filter leaks another tenant's data. Because scoping now lives in the Repo instead of scattered across service methods, the Repo is the one file to audit for a tenant-isolation review. [`examples/widget/widget.repo.ts`](examples/widget/widget.repo.ts) is a worked example extending a `TenantService` base class — copy that shape if you have (or want) an equivalent.

## File 2 — `<name>.policy.ts`

One pure decision function per action. No DB import — unit-testable with a bare role string. Wrap whatever your project's RBAC source of truth is (a permissions map, a database-backed role table, a third-party authz library) behind a single shared primitive, so every module's policy file calls the same function instead of reinventing the check.

```ts
import { checkPermission } from "../../lib/policy";

import type { PolicyDecision } from "../../lib/policy";

export const <Name>Policy = {
  canList: (role: string | null): PolicyDecision => checkPermission(role, "<resource>", "list"),
  canGet: (role: string | null): PolicyDecision => checkPermission(role, "<resource>", "get"),
  canCreate: (role: string | null): PolicyDecision => checkPermission(role, "<resource>", "create"),
  canUpdate: (role: string | null): PolicyDecision => checkPermission(role, "<resource>", "update"),
  canDelete: (role: string | null): PolicyDecision => checkPermission(role, "<resource>", "delete"),
};
```

`<resource>` must be a real entry in your RBAC source of truth — if it's missing (a genuinely new resource), add it there first, in its own commit, before writing this file. If your RBAC matrix has no `"delete"` (or other) action for this resource, don't invent one — reuse the nearest existing action (e.g. map `canDelete` onto `"update"`) and say so in a comment, as [`examples/widget/widget.policy.ts`](examples/widget/widget.policy.ts) does for `canArchive`.

## File 3 — `<name>.service.ts`

Composes Repo + Policy. Every method: check the Policy decision first, deny (masked auth error, real reason logged server-side) if not allowed, then call the Repo — mutations wrapped in a transaction.

```ts
import { ForbiddenException } from "elysia-http-exception";

import { db } from "../../db";
import { <Name>Policy } from "./<name>.policy";
import { <Name>Repo } from "./<name>.repo";

import type { Insert<Name>, Select<Name> } from "./<name>.schema";

interface Actor {
  role: string | null;
  userId: string | null;
}

// `reason` is a machine tag for server-side logging — never put it in the
// thrown message. If your project has a masked-error/structured-logging
// helper (a client-safe message plus a hidden `reason` recorded server-side),
// prefer that here — it keeps the throw self-auditing with no extra log line
// needed. This example sticks to elysia-http-exception, already in scope, to
// stay a portable, dependency-minimal reference — log `reason` yourself if
// you don't have an equivalent helper.
function deny(_actor: Actor, _reason: string): never {
  throw new ForbiddenException("Access denied.");
}

export class <Name>Service {
  private readonly repo = new <Name>Repo();

  constructor(private readonly actor: Actor) {}

  async list(query: { limit?: number; page?: number }) {
    const decision = <Name>Policy.canList(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);
    return this.repo.findMany(query);
  }

  async create(body: Insert<Name>): Promise<Select<Name> | undefined> {
    const decision = <Name>Policy.canCreate(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);
    return db.transaction(async (tx) => this.repo.insert(tx, body));
  }

  // update/remove: same shape — Policy check → deny() on failure →
  // db.transaction(tx => repo.update/repo.remove).
}
```

### State-transition methods (`/approve`, `/cancel`, `/confirm`, …)

Anything that flips a status field under concurrency must **lock the row first (in the Repo), then guard the precondition in JS (in the Service)** — not in the SQL `where`:

```ts
async approve(id: string): Promise<Select<Name> | undefined> {
  const decision = <Name>Policy.canApprove(this.actor.role);
  if (!decision.allowed) deny(this.actor, decision.reason);

  return db.transaction(async (tx) => {
    const current = await this.repo.lockForUpdate(tx, id); // ← serializes concurrent transitions
    if (!current || current.status !== "pending") return undefined; // → 400/409 in the route

    return this.repo.update(tx, id, { status: "active" });
  });
}
```

`.for("update")` (inside the Repo's `lockForUpdate`) is what stops two requests both passing the status check and both succeeding. Keep the precondition check in JS (not baked into the SQL `where`) so it's explicit and the locked row is a snapshot you can report on.

## File 4 — `<name>.routes.ts`

```ts
import Elysia from "elysia";
import { httpExceptionPlugin, InternalServerErrorException } from "elysia-http-exception";
import z from "zod";

import { create<Name>Schema, select<Name>Schema, update<Name>Schema } from "./<name>.schema";
import { baseQuerySchema, paginationResponseSchema } from "../../lib/schema";
import { authPlugin } from "../auth/auth.plugin"; // however your project resolves the authenticated actor
import { <Name>Service } from "./<name>.service";

export const <name>Routes = new Elysia({ name: "<name>", prefix: "/<name>s", tags: ["<Name>"] })
  .use(authPlugin)                         // ← resolves role/userId (and org scope, if scoped)
  .use(httpExceptionPlugin())              // ← maps thrown exceptions to the right HTTP status
  .model({ <Name>: select<Name>Schema })   // ← keeps typed-client inference working
  .resolve(({ role, userId }) => ({ service: new <Name>Service({ role, userId }) }))
  .get(
    "",
    async ({ query, status, service }) => {
      const { page = 1, limit = 100 } = query;
      const data = await service.list(query);
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

## File 5 — register in `src/modules/routes.ts`

```ts
import { <name>Routes } from "./<name>/<name>.routes";

// inside the chain:
.use(<name>Routes)
```

**Order matters:** mount **public routes before authed ones**. An auth plugin that uses `.guard({ as: "global" })` propagates its guard downward to every sibling registered _after_ it — so a public route mounted after an authed sibling starts demanding auth. See the `elysia-zod` skill, case 5.

## Naming conventions

- Folder + file: `kebab-case` (`purchase-order/purchase-order.repo.ts`)
- Repo/Policy/Service classes: `PascalCase` ending in `Repo`/`Policy`/`Service` (`PurchaseOrderRepo`, `PurchaseOrderPolicy`, `PurchaseOrderService`)
- Exported routes: `<name>Routes` (`purchaseOrderRoutes`)
- Path prefix: plural (`/purchase-orders`)
- Zod schemas: `create<Name>Schema`, `select<Name>Schema`, `update<Name>Schema`

## Common pitfalls

- **Importing `<name>.repo.ts` from `<name>.routes.ts`** — the Repo is raw, unauthenticated DB access; skipping the Service means skipping the Policy check entirely. This is the exact mistake the Repo/Policy/Service split exists to make structurally harder — routes call only the Service.
- **A Policy file with no matching route-level RBAC test** — every module's test suite should have a role-diff case (one role denied, one role green-path) so a Policy regression is caught in CI, not discovered live.
- **No `.use(httpExceptionPlugin())`** → a thrown `NotFoundException` etc. surfaces as 500 instead of the intended status.
- **No `.model({...})`** → typed-client (e.g. Eden Treaty) inference breaks for body/response shapes.
- **Wrapping `.resolve()` inside a `.guard()` an auth plugin already set globally** → double-guard / scope leak (`elysia-zod` case 5).
- **Returning a raw `delete` result that's already `null`** → return `{ id }` against an explicit delete-response schema.

## After scaffolding

1. Typecheck — the generated client/contract package (Eden, OpenAPI types) is the canary.
2. Add an e2e test for the new endpoints, including the Policy role-diff case.
