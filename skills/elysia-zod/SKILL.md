---
name: elysia-zod
description: Decode Elysia + Zod validation errors fast. Use when an HTTP request to an Elysia backend returns 4xx (especially 400 or 422) and the response body/logs contain a Zod valueError/customError. Maps the six most common error shapes to their exact fixes. Assumes drizzle-zod (createInsertSchema/createSelectSchema); adapt for hand-written schemas.
---

# Elysia + Zod validation debug checklist

When an Elysia route returns 4xx and the logs contain a Zod `valueError`/`customError` block, find the symptom below and apply the fix. Stop reading the schema dump — these six patterns cover the large majority of failures on an Elysia + Zod backend (examples assume drizzle-zod's `createInsertSchema`/`createSelectSchema`).

## 1. `"expected date, received string"` on a request body

**Symptom**: a `POST`/`PATCH` returns 422. The body schema picked a timestamp via `createInsertSchema(table)` so its Zod type is `z.date()`. JSON over HTTP transmits dates as ISO strings → the route rejects them.

**Fix**: in the insert/update schema, override the date field with `z.coerce.date()`:

```ts
export const insert<Entity>Schema = createInsertSchema(<table>)
  .pick({ notes: true, departmentId: true })
  .extend({
    expiresAt: z.coerce.date(), // ← was inferred as z.date()
  });
```

Apply to every datetime field in any *insert* or *update* schema.

## 2. `"expected date, received string"` on a response body

**Symptom**: a list/`GET` endpoint returns 422. The service builds child rows via a SQL aggregation (e.g. `sql<X[]>\`json_build_object('createdAt', ${t.createdAt}, ...)\``) → the DB serializes timestamps as strings → the response schema declares `z.date()` → mismatch.

**Fix**: coerce the timestamps in the *response* schema for the aggregated child:

```ts
export const select<Child>Schema = createSelectSchema(<childTable>).extend({
  createdAt: z.coerce.date(), // ← was z.date() from createSelectSchema
  updatedAt: z.coerce.date(),
  // also declare ad-hoc fields the SQL aggregation injects:
  joinedLabel: z.string().nullable().optional(),
});
```

## 3. `"expected string, received null"` (or `"received undefined"`) on a response field

**Symptom**: a 422 names a path like `["data", 0, "address"]`. The DB column is nullable, Drizzle returns `null`, but the Zod schema used `.optional()` — which only permits `undefined`, not `null`.

**Fix**: change `.optional()` → `.nullable().optional()` for that field:

```ts
// WRONG — rejects null
createSelectSchema(<table>, { address: z.string().optional() });

// RIGHT
createSelectSchema(<table>, { address: z.string().nullable().optional() });
```

Same fix for any column not marked `.notNull()` in the model.

## 4. 500 on an endpoint that needs a user identity

**Symptom**: routes that write the caller's id (`reporterId`, `technicianId`, `createdBy`, …) return 500 with a foreign-key violation against the users table.

**Cause**: the request authenticated with a strategy that has **no associated user** — an API key or service token. The auth layer sets `userId = ""` (keys aren't tied to a user), so the FK to `user.id` fails.

**Fix in tests**: authenticate as a real user/session, not an API key (e.g. a signed session cookie), so `userId` is populated.

**Fix in app code**: don't expose user-identity endpoints to non-user auth strategies; or, if you must, return a clear 400 instead of letting the FK explode.

## 5. Public route returning 400 even though no auth is required

**Symptom**: a public route (e.g. `GET /invites/by-token/:token`) returns 400 `"Missing API Key or Session"` even though it never `.use(authPlugin)`.

**Cause**: an auth plugin using `.guard({ as: "global", ... })` leaks scope. A public route mounted as a **sibling after** an authed route, under the same parent, inherits the global guard.

**Fix**: mount the public route **before** any sibling that uses the auth plugin:

```ts
export const routes = new Elysia({ name: "routes" })
  .use(healthRoutes)
  .use(publicInviteRoutes)   // ← public first
  .use(brandRoutes)          // these all .use(authPlugin)
  .use(authedInviteRoutes)
  // ...
```

Elysia's global guards propagate **downward** from where they're registered — order is the fix.

## 6. 422 / 401 on a route that calls an auth-library permission method

**Symptom**: a session-authenticated request gets 401 / "not allowed" from an endpoint that internally calls an auth library's org/permission API (e.g. better-auth's `auth.api.getFullOrganization`, `listMembers`, `createTeam`).

**Cause**: the library enforces **fine-grained permissions** separately from your coarse role check. Being an admin in your own `member` table doesn't automatically grant the library's `team:create` / `member:list` permission in its access-control statements.

**Fix**: either (a) align the library's permission config (e.g. `organizationRoles` / access-control statements) to grant the missing action, (b) seed the user with a role that already has it, or (c) skip the test with a TODO until permissions are reconciled.

---

## How to extract the right symptom from the log

A structured logger (pino, etc.) dumps the full validator schema on every 422. Don't read that — search the log line for these keys, in order:

1. `"customError":` — usually a one-line human reason (`"Invalid input: expected date, received string"`)
2. `"path":` — the field that failed, e.g. `["data", 0, "items", 0, "createdAt"]`
3. `"type": "body"` vs `"type": "response"` — tells you whether to fix the request schema (cases 1, 4) or the response schema (cases 2, 3)

That's enough to pick the right fix above.
