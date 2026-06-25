# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **source repository for reusable agent skills** — not an application. There is no build, test, or lint
step and no `package.json`. The deliverable is a set of `SKILL.md` files that other repos install with
[`npx skills`](https://github.com/vercel-labs/skills). Each skill encodes a stack convention (a pattern to
drop into any project on that stack), deliberately **not** glue for one specific repo.

Published as `sanctuarynode/skills` (see the install commands in `README.md`).

## Layout

- `skills/<skill-name>/SKILL.md` — one authored skill per directory. These are the repo's actual content.
- `.agents/skills/` and `.claude/skills/` — **install artifacts**, not authored content. They hold skills
  pulled in from *other* repos (e.g. `mattpocock/skills`, `github/awesome-copilot`) for local use, tracked
  in `skills-lock.json`. Do not author new skills here; author under `skills/`.

## Authoring a skill (the core task in this repo)

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter: `name:` and `description:`.
2. **`name:` must exactly equal the directory name** (e.g. dir `elysia-pattern` → `name: elysia-pattern`).
3. **`description:` is a trigger rule, not a summary.** The agent matches it every turn to decide whether to
   load the skill, so pack it with the literal phrases, symptoms, and error messages that should trigger it
   ("add a new module", "create a service for X", specific 4xx errors, etc.). See existing skills for the
   density expected.
4. **Keep it generic.** Describe the stack convention, never one repo's file paths. Lead the body with the
   smallest mental model (often an ASCII file-shape diagram), then concrete steps/code. If a detail is
   project-specific (a glossary, an internal path), say so explicitly and point at the consuming repo rather
   than hardcoding it.

The current skills (`elysia-pattern`, `elysia-zod`, `next-fetching-query`, `next-mutations`, `i18n-next-intl`)
are the reference for tone, structure, and description density — read one before writing a new one.

## CLI commands

```bash
# List what a source repo offers without installing
npx skills add <owner/repo> -l

# Install specific skills from this repo into a consuming project
npx skills add sanctuarynode/skills --skill <name>     # one skill
npx skills add sanctuarynode/skills --skill '*'        # all skills
```

`--skill` / `--agent` take **space-separated** values, not comma-separated. Agent IDs are e.g. `universal`
(→ `.agents/skills/`, the canonical location) and `claude-code` (→ `.claude/skills/`); `generic`/`claude`
are not valid IDs.
