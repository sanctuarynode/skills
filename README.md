# Skills

Reusable [agent skills](https://skills.sh) for the stacks we build on.
The conventions we use as a company across the products we build, not generic best practices.

Each skill is a stack **convention**, a pattern you can drop into any project on that stack, not glue for one specific repo.

## Install

```bash
# Select skills interactively
npx skills add encurehq/skills
```

## Available skills

| Skill                   | Stack                    | What it's for                                                                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup-agent-first`     | Any stack                | Bootstrap or retrofit a repo with AGENTS.md, structured docs, an ADR convention, and optional automation so AI agents can work without per-session hand-holding. Safe to re-run later — it detects its own prior setup and iterates (new docs/deps/patterns since last run) instead of starting over. |
| `elysia-pattern`        | Elysia + Drizzle + Zod   | Scaffold a backend module the canonical way: a Repository/Policy/Service trio, a routes file, and a one-line registration.                                                                                                                                                                            |
| `elysia-zod`            | Elysia + Zod             | Decode 4xx validation errors fast — the six most common error shapes mapped to their exact fixes.                                                                                                                                                                                                     |
| `next-monorepo-pattern` | Next.js monorepo         | Where routes, components, hooks, and lib code live — the `packages/ui` → app → route priority chain, role-first forms and dialogs.                                                                                                                                                                    |
| `next-tanstack-query`   | Next.js + TanStack Query | The canonical read (`lib/data`, prefetch → hydration → `useQuery`) and write (`lib/action`, throws → toast, optimistic `useMutation`) data pattern.                                                                                                                                                   |
| `i18n-next-intl`        | next-intl                | Keep next-intl translations in sync across every locale.                                                                                                                                                                                                                                              |
