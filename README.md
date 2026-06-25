# skills

Reusable agent skills — our conventions for the stacks we build on. Each skill is a
pattern you can drop into any project using that stack, not glue for one specific repo.

Each skill is a `SKILL.md` under `skills/<skill-name>/`, installable with
[`npx skills`](https://github.com/vercel-labs/skills).

## Install

```bash
# all skills
npx skills add sanctuarynode/skills --skill '*'

# a single skill
npx skills add sanctuarynode/skills --skill elysia-pattern
```

## Skills

| Skill | Stack | What it's for |
| --- | --- | --- |
| `elysia-pattern` | Elysia + Drizzle + Zod | Scaffold a backend module the same way every time: service class + routes file + registration, with the returnable-columns, transactional-mutation, and `.for("update")` state-transition idioms. |
| `elysia-zod` | Elysia + Zod (drizzle-zod) | Map the six common Elysia + Zod 4xx validation errors to their exact fixes (`z.coerce.date`, `.nullable().optional()`, auth identity, global-guard leak, permission-vs-role). |
| `next-fetching-query` | Next.js + TanStack Query | Fetch data the canonical way: server-component prefetch → `HydrationBoundary` → client `useQuery` on the same key, typed API-client syntax, and `keepPreviousData` for filtered tables. |
| `next-mutations` | Next.js + TanStack Query | Write data the canonical way: a server action that throws, triggered via `useTransition` or optimistic `useMutation` (Insert/Patch/Remove), with TanStack Form + Zod and Sonner toasts. |
| `i18n-next-intl` | next-intl | Keep translations in sync across every locale — edit all locale files together, follow the namespace/placeholder conventions, and verify no key is missing. |

## Adding a skill

1. Create `skills/<skill-name>/SKILL.md`.
2. The frontmatter `name:` must equal the directory name (e.g. `elysia-pattern`).
3. Write `description:` as a **trigger rule** — pack it with the literal phrases, symptoms, and
   errors that should make an agent load the skill, not a summary. The agent matches against it
   every turn to decide whether to pull the skill in.
4. Keep skills **generic**: describe the stack convention, not one repo's file paths. Lead the
   body with the smallest mental model, then concrete steps/code. If a detail is project-specific
   (a glossary, an internal path), say so and point at the consuming repo instead of hardcoding it.
