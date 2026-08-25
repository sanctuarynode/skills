# Skills

Reusable [agent skills](https://skills.sh) for the stacks we build on.

Each skill is a stack **convention**, a pattern you can drop into any project on that stack, not glue for one specific repo.

## Install

```bash
# Select skills interactively
npx skills add sanctuarynode/skills
```

## Available skills

| Skill                 | Stack                    | What it's for                                                                                                                             |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `elysia-pattern`      | Elysia + Drizzle + Zod   | Scaffold a backend module the canonical way: a Repository/Policy/Service trio, a routes file, and a one-line registration.                 |
| `elysia-zod`          | Elysia + Zod             | Decode 4xx validation errors fast — the six most common error shapes mapped to their exact fixes.                                         |
| `next-queries`        | Next.js + TanStack Query | Fetch data the canonical way: server prefetch → `HydrationBoundary` → client `useQuery` on the SAME key.                                  |
| `next-mutations`      | Next.js + TanStack Query | Write data the canonical way: server action that throws → `useTransition` (simple) or optimistic `useMutation`, with TanStack Form + Zod. |
| `next-monorepo-pattern` | Next.js monorepo       | Where routes, components, hooks, and lib code live — the `packages/ui` → app → route priority chain, role-first forms, `lib/data` + `lib/action` split. |
| `i18n-next-intl`      | next-intl                | Keep next-intl translations in sync across every locale.                                                                                  |
