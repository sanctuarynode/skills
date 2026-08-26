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
| `next-monorepo-pattern` | Next.js monorepo + TanStack Query | Where routes, components, hooks, and lib code live — the `packages/ui` → app → route priority chain, role-first forms — plus the canonical read (`lib/data`, prefetch → hydration → `useQuery`) and write (`lib/action`, throws → toast, optimistic `useMutation`) pattern. |
| `i18n-next-intl`      | next-intl                | Keep next-intl translations in sync across every locale.                                                                                  |
| `setup-agent-first`   | Any stack                | Bootstrap or retrofit a repo with AGENTS.md, structured docs, an ADR convention, and optional automation so AI agents can work without per-session hand-holding. |
