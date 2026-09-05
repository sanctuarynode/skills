# Templates

## "Working with an agent" section

This skill never generates a standalone `CONTRIBUTING.md` from scratch — writing a full contributor-onboarding doc (prerequisites, install steps, env setup) isn't this skill's job, and templating one in risks placeholder content that goes stale immediately. Instead it appends one short, human-facing section explaining the agent-first setup:

- **`CONTRIBUTING.md` already exists** → append this section to the end of it.
- **No `CONTRIBUTING.md`** → append this section to the end of `README.md` instead.
- **Neither exists** → skip; there's nothing to append to.

Always a plain Markdown `##` heading, appended directly with no start/end markers — this is prose for a human reader, not a block a later run needs to find and replace, so it doesn't need the `AGENTS.md`-style marker convention (see SKILL.md § Appending, not overwriting, AGENTS.md). If the section already exists (a prior run added it), don't duplicate it — leave it as is, or update it if the docs layer changed since.

The point of this section is to make the payoff concrete for a dev who's never worked in a repo set up this way: an AI coding agent should already know the answer instead of needing an explanation first. Keep it short — a couple sentences plus 2–3 examples, not a tutorial on prompting.

```markdown
## Working with an agent

This repo is set up **agent-first**: `AGENTS.md` plus the structured docs in
[`docs/`](docs/README.md) mean an AI coding agent (Claude Code, Cursor,
whatever you use) can usually answer how something works or build a feature
correctly without you explaining the codebase to it first. Just ask.

Examples of what an agent working in this repo should handle with no extra
context from you:

- "How does <the repo's actual auth mechanism, if one exists> work?"
- "Where do I add a new <the repo's actual primary resource — API route,
  page, CLI command — whatever Phase 1 found this repo is built from>?"
- "What's the convention for <a real repeated pattern from this specific
  repo — writing a migration, adding a test, adding a translation string>?"

If the agent's answer is a guess instead of a pointer to a doc in
`docs/reference/` or `docs/explanation/`, that's a sign the matching doc is
missing or gone stale — worth fixing, not working around.
```

Every bullet's placeholder must be filled from Phase 1/3's actual findings for *this* repo — an auth mechanism that doesn't exist in the target repo, or a resource type it doesn't have, is exactly the templating mistake SKILL.md § Deriving, not templating warns about. If the repo has no auth at all, drop that bullet rather than inventing one.

## Documentation index (inside AGENTS.md)

A keyword-routing table appended inside the `SETUP-AGENT-FIRST` marker block — separate from `docs/README.md`, which stays a plain file map used for drift-checking. This table is what keeps `AGENTS.md` thin while still driving convention-following: one row per real repeated task in *this* repo, never a copy of doc content.

Row sourcing:
- A row needing evidence of a repeated code pattern (e.g. "list page pattern") → deep scan only, same bar as a domain-specific subagent proposal.
- A row inferable from a single dependency in the manifest (e.g. `next-intl` present → an i18n row) → available on light scan too, same as `polish`.

```markdown
## Documentation index — read the matching doc first

Before writing code, check whether the task matches a row below. If it
does, `Read` the linked doc **before** writing anything — not after, not
"I remember this pattern."

| Working on… (keyword) | What it covers | Related docs |
|---|---|---|
| <task keyword found in this repo> | <one-line description> | <doc path(s)> |

### Self-check before code

1. **What am I writing?** — name the kind of thing (form, route, migration,
   component, whatever this repo's real categories are).
2. **Match a keyword above?** If yes, name the doc in your reply and
   `Read` it, this turn, before any code.
3. **Then write, mirroring the doc.** Code that contradicts a matched doc
   is a bug even if it works.

When nothing matches, that's fine — not every task has a captured
convention yet.
```

Every row's keyword/description/doc-path must come from *this* repo's actual findings — a row for a pattern this repo doesn't have is the same templating mistake SKILL.md § Deriving, not templating warns about.

## ADR convention (paragraph for AGENTS.md)

Insert into the generated `AGENTS.md` verbatim, adjusted only for the repo's actual `docs/` path if it differs from `docs/adr/`:

```markdown
## Architecture Decision Records (ADRs)

`docs/adr/` holds short, append-only records of *why* a structural choice was
made. **Never create an ADR unprompted.** When a change is a new cross-cutting
convention, a data-model seam, a package-boundary change, an auth/isolation
invariant, or a choice between competing approaches where a viable
alternative was rejected for real reasons — stop and ask the user whether
they want one, then create it only if they say yes. Filename
`NNNN-kebab-title.md`, zero-padded, next number after the highest existing
file. Sections: Context, Decision, Alternatives Considered (one `###`
sub-header per rejected option with Pros/Cons/Rejected), Consequences. Never
rewrite a past ADR — a reversal is a new ADR that supersedes the old one;
flip the old file's status to `Superseded by NNNN` and leave the file in
place.
```

## Plan file

Written at the target repo's root as `agent-first-setup-plan.md`. Every action gets its own checklist line so a resumed run can tell what's already done.

```markdown
# agent-first-setup-plan.md

Generated by /setup-agent-first — safe to delete once the run completes;
this file's only job is surviving an interrupted run.

## Documentation
- [ ] Create/append AGENTS.md (inside `SETUP-AGENT-FIRST` markers — see SKILL.md § Appending, not overwriting, AGENTS.md)
- [ ] Create docs/how-to/, docs/reference/, docs/explanation/ with N starter docs (list them)
- [ ] Create docs/adr/README.md + ADR convention paragraph in AGENTS.md
- [ ] Append "Working with an agent" section to CONTRIBUTING.md (or README.md if no CONTRIBUTING.md exists)
- [ ] Existing module READMEs found (list each path) — one line per file, each marked pointer-doc or moved:
      - [ ] <path/to/module/README.md> → pointer doc at <docs path> + indexed
- [ ] domain-model.md completeness check passed (every top-level service/module named or explicitly marked out-of-scope by the user)
- [ ] Documentation index table added to AGENTS.md (N rows — list keywords)
- [ ] Monorepo sub-projects listed in domain-model.md (list each: name, stack, metadata path) — only if Phase 1 detected a monorepo
- [ ] Framework-convention research cache files written (list: docs/explanation/<framework>-conventions.md) — only if deep scan ran and a framework was detected
- [ ] AGENTS.md LAST-RUN marker updated (sha + date)

## Agent-context files
- [ ] Create CLAUDE.md (pointer to AGENTS.md)
- [ ] Create GEMINI.md (pointer to AGENTS.md)
      (list only the ones actually selected)

## Automation layer
- [ ] Generate `polish` subagent + command (derived from: <tools found>)
- [ ] Generate `test` subagent (derived from: <runner found>)
- [ ] Generate `docs-sync` subagent
- [ ] Install + init CodeGraph, run `codegraph install`

## Tooling
- [ ] Install husky, wire pre-commit (derived from: <tools found>)
- [ ] Write CI workflow (derived from: <tools found>)
- [ ] Add docs-index-drift CI check

---
Status: awaiting explicit go — see SKILL.md § Consent gate.
```

Check off each line as its step completes during execution. Delete the whole file on successful completion of every line.

## LAST-RUN marker (inside the AGENTS.md marker block)

The last line inside `<!-- SETUP-AGENT-FIRST:START -->`/`...:END` is always:

```html
<!-- SETUP-AGENT-FIRST:LAST-RUN sha=<commit-sha-at-run-time> date=<YYYY-MM-DD> -->
```

Updated every run (fresh or update). This is what a later update-run reads to scope its `git log --since=<sha>` pattern-mining pass — see SKILL.md § Idempotency check. No separate marker file needed.
