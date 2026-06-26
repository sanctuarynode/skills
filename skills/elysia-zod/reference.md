# elysia-zod: a worked 422

`SKILL.md` lists the six error shapes and their fixes. This file is the bulky
companion you reach for once, to calibrate: one **real, full** 422 log dump,
annotated so you can see exactly where the three deciding fields sit — then the
trace from those fields to the matching case. You won't need it every time.

## The raw log (pino, unrelated keys trimmed)

A structured logger dumps the **entire** validator schema on a 422. That dump is
mostly noise — the deciding signal is three fields. Here is a representative one
for a list endpoint whose child rows are built by a SQL aggregation:

```json
{
  "level": 50,
  "time": 1719500000000,
  "msg": "Validation failed",
  "code": "VALIDATION",
  "error": {
    "type": "response",
    "on": "response",
    "summary": "Expected date, received string",
    "customError": "Invalid input: expected date, received string",
    "path": ["data", 0, "items", 0, "createdAt"],
    "schema": {
      "type": "object",
      "properties": {
        "data": { "type": "array", "items": { "...": "200 lines of nested validator JSON" } }
      }
    },
    "found": "2026-06-27T09:13:20.000Z"
  }
}
```

## Reading it — the three fields, in order

1. **`customError`** → `"expected date, received string"`. The human reason.
2. **`type`** → `"response"`. The failure is on the **response** schema, not the
   request body — so the fix lives in a `select…Schema`, not an `insert…Schema`.
3. **`path`** → `["data", 0, "items", 0, "createdAt"]`. A `createdAt` on an
   aggregated child row (`items`), which a SQL `json_build_object` serialized as
   a string.

`customError` (date/string) + `type: response` + a timestamp on an aggregated
child → **case 2**. Fix: `z.coerce.date()` on `createdAt`/`updatedAt` in the
child's response schema. Had `type` been `"body"`, the same date/string message
would be **case 1** instead — the request schema.

## Why not just read the schema dump?

The `schema` block is the validator's full expectation — hundreds of lines on a
real endpoint. It tells you *what was expected* but buries *what differed*. The
three fields above are the diff; `scripts/extract-error.sh` filters any dump down
to exactly them.
