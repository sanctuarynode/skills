# Phase 4 category catalog

The single batched question for a fresh setup run. Pre-check/pre-fill options from Phase 1/3 findings wherever possible — e.g. if `CLAUDE.md` already exists, it's pre-selected; if a clear domain model exists, the domain-model doc is proposed on.

**Every group below (A/B/C/D) gets an explicit "None of these" option, offered from the start — never add it only after the user selects nothing and gets re-asked.** Selecting "None" for a group is a normal, first-class outcome, not an error state.

## A. Documentation layer (agent-agnostic — offered on every run, plus None)

`AGENTS.md` itself is never optional (see below), but every other row in this group is — include a "None of these" option covering everything except `AGENTS.md`.

| Item | Default | Notes |
|---|---|---|
| `AGENTS.md` | always on, not askable | root convention file, single source of truth every other agent-context file points at. If it already exists, this is always an append (never ask modify-vs-append) inside `<!-- SETUP-AGENT-FIRST:START -->`/`...:END` markers — see SKILL.md § Appending, not overwriting, AGENTS.md |
| Structured docs (how-to / reference / explanation) | proposed on | Don't say "Diataxis" in the question **title** — it's jargon most users won't recognize. Fine to mention in the description for people who do. Title reads like: "Organize docs into how-to / reference / explanation guides?" |
| ADR process | proposed on | No ADR tooling gets built. Only a convention paragraph goes into `AGENTS.md` — see `templates.md#adr-convention` — covering when to offer one, the ask-before-creating rule, file naming, section order. The agent reading `AGENTS.md` later does the actual writing when a real decision comes up. |
| Diagrams (mermaid) | proposed only if domain complexity warrants it (multiple services, non-trivial data model found) | |
| Domain-model explanation doc | proposed only if a clear business domain exists — skip for a CLI tool, library, or infra-only repo | must pass the completeness check in SKILL.md § Phase 4 before it's considered done, regardless of scan depth |
| "Working with an agent" section | proposed on | Never a standalone `CONTRIBUTING.md` generated from scratch — appended to the existing `CONTRIBUTING.md` if one exists, else to `README.md`. Plain `##` heading, no markers (it's prose for a human reader). See `templates.md#working-with-an-agent-section`. |
| Documentation index table | proposed on | Keyword → doc routing table appended inside `AGENTS.md`'s marker block, separate from `docs/README.md`. See `templates.md#documentation-index-inside-agentsmd`. Some rows available on light scan (dependency-inferred), most need deep scan (code-pattern-inferred) — see that template section for the split. |
| **Existing module/service READMEs** | one row per file Phase 1 found beyond the root README | See "Existing module READMEs" below — never silently skip one. |

### Existing module READMEs

Phase 1 finds these by globbing subdirectories, not just the root. **Every one found gets a decision, individually — never bundle them into a single yes/no.** Two options per file, default is the first:

1. **Keep in place, add a thin pointer doc** — generate a short `docs/explanation/<topic>.md` (or `reference/`, if it's more lookup-table shaped) that states the file is the canonical doc for that subsystem and links to it, then add that pointer to the docs index. This is the default: a module README living next to its code is usually exactly where its authors and its readers expect it, and centralizing would just move it away from the code it describes.
2. **Move the content into the structured docs tree** — only if the user explicitly prefers centralizing everything under `docs/`. Physically relocate the content (don't duplicate it in two places), split across how-to/reference/explanation if it mixes modes, and leave nothing orphaned at the old path.

Whichever option, **every found README ends up either linked from the docs index or physically moved — none are left untouched and unindexed.** That's the exact failure mode this section exists to close: a module README found during detection but never mentioned again anywhere in the generated docs.

### Monorepo sub-projects

When Phase 1 classifies the repo as a monorepo (see `references/metadata-sources.md`), `domain-model.md` must name every detected sub-project individually — its name, its ecosystem/stack, and its metadata file path — not just the top-level directories a plain listing would show. No sub-project gets its own `AGENTS.md`; the root `AGENTS.md` stays the single source of truth, and this coverage lives in `domain-model.md` instead. This is the same completeness bar as SKILL.md § Phase 4's domain-model check, applied to metadata-detected sub-projects rather than directory names alone.

## B. Agent-context files (per detected/selected runtime, plus None)

Phase 1 detects runtimes from both files (`CLAUDE.md`, `.cursor/rules`, etc.) and their supporting directories (`.claude/`, `.cursor/`, `.codex/`, `.opencode/`, `.agents/`, `.gemini/`, `.github/`) — this replaces asking "which runtimes do you use." Three outcomes, no question in two of them:

- **No runtime detected at all** — write straight to `AGENTS.md`, no §B question.
- **A runtime detected but its context file is missing or an empty/pointer-only stub** — no question either: generate `AGENTS.md` plus a thin pointer file for it, per the default below.
- **A runtime detected with a context file that already has substantive content** — this is the only case that asks, and it's one batched question per such file: *"Consolidate `<file>`'s content into `AGENTS.md` (making `<file>` a thin pointer), or leave `<file>` as-is and add `AGENTS.md` as a separate generic layer?"*

Every non-`AGENTS.md` file (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, `.github/copilot-instructions.md`) is generated as a **thin pointer that imports/references `AGENTS.md`** — never a duplicate copy of its content. A 2–5 line file whose only job is "read AGENTS.md."

## C. Automation layer (offered per targeted agent runtime — plus None)

Not Claude Code-exclusive: subagents and commands are offered for every runtime in Phase 1's **detected set** (pre-checked in the batch). If Phase 1 detected zero runtimes, that's the one case §C asks explicitly which runtime(s) to generate for — there's no signal to derive from. Each is generated in that runtime's own native format — see SKILL.md § Automation layer targets any runtime, and the known-shapes starting reference at **[`references/agent-runtime-shapes.md`](agent-runtime-shapes.md)**, for how to derive the file shape for a runtime other than Claude Code. `.claude/agents/`/`.claude/commands/` is the reference example, not the only supported shape — and a runtime's rules/instructions file (`.cursor/rules/*.mdc`, `.github/instructions/**/*.instructions.md`, etc.) is never the command-equivalent, it's the same context-file role Phase 4 §B already covers.

Include a "None" option covering the whole group for a user who only wants the documentation layer. Unlike the rest of this group, `polish` and CodeGraph don't require deep scan — offer this group (with those two available) on *either* scan depth; the remaining items only appear once deep scan has actually run.

Not shipped as templates — proposed as *capabilities*, generated per-repo at execution time from Phase 1/3 findings (see SKILL.md § Deriving, not templating):

- **`polish`** (command + subagent) — runs this project's lint/format/typecheck and fixes violations. Tool names, commands, and config paths come from the scan, never assumed. **Available on light scan too** — Phase 1's cheap detection already checks for lint/format/typecheck config (a config file on disk, or the equivalent block in `package.json`/language manifest) and the scripts that run them, which is all `polish` needs. Don't wait for deep scan just to offer this one.
- **`test`** (subagent) — owns writing/fixing tests for this project's actual test layers, using whatever runner the scan found. Requires deep scan — proposing this well means knowing the project's actual test *patterns*, not just which runner is configured.
- **`docs-sync`** (subagent) — keeps the docs index and `AGENTS.md`'s doc-table in sync whenever docs are added/moved/removed. Same shape regardless of stack — no derivation needed, this one *is* close to a template because its job (index maintenance) has nothing to do with the target's language or tooling. Requires deep scan, same as the rest of this group.
- **`group-commit`** (command) — only proposed once a commit-grouping convention exists or is being written into `AGENTS.md` in this same run. Skip it otherwise — nothing to group by yet. Requires deep scan.
- **Domain-specific subagents** — *only* ever proposed from deep-scan findings on the actual repo (e.g. "12 routes repeat the same auth-gating check → propose an auth-focused subagent"). Never part of the starter set, never generic, never proposed without a specific finding backing it. Requires deep scan — this is exactly the kind of proposal a light scan has no evidence for.
- **CodeGraph** — always offered as its own checkbox in this group, every run (light or deep), regardless of which runtimes are targeted, and labeled `(recommended)` in the option text. It never comes from a scan finding, which is exactly why it's easy to forget when building the rest of this group from Phase 1/3 results — check it's present before sending the batch. It isn't subject to the per-runtime lookup step above either: its own installer already auto-detects and wires up 9+ agent runtimes on its own. See SKILL.md § CodeGraph for what selecting it does.
- `settings.json`/permission tuning — only touched if the user opted into something above that needs it. No reason otherwise.

## D. Tooling / process (agent-agnostic, opt-in, three *independent* checkboxes plus None)

- Husky pre-commit (lint/format/typecheck gate) — stack-derived command, same rule as `polish`.
- CI workflow (lint/typecheck/test) — stack-derived.
- **Docs-index-drift CI check** — separate checkbox, never bundled into the two above. Only meaningful if the documentation layer (§A) was also selected; skip offering it otherwise.
- **None of these** — skip the whole tooling/process group. This is the option that was missing when this bug was found: a user declining every item in this group is not a malformed answer that needs re-asking, it's a valid "skip tooling entirely" outcome, offered up front.

## Update-run interview (short form, replaces A–D above when Phase 1 detects an existing setup)

- New docs added since last run that aren't in the index yet? → offer to sync.
- New repeated patterns found (if doing a deep rescan) worth a subagent? → offer to propose.
- Any doc referenced in the index that no longer exists on disk, or vice versa? → offer to fix (this is the exact class of bug a prior manual setup can drift into).

(See SKILL.md § Idempotency check for the git-log-driven checks — new dependencies and repeated new-file patterns since the last run — that additionally scope this interview.)

## Deciding: doc vs subagent vs mandatory-dispatch

A concrete checklist for what a repeated pattern becomes, instead of a judgment call:

**Doc only (a row in the documentation-index table, § A)** — the pattern is knowledge about how to write code correctly, with no procedure beyond "read this, then write code matching it."

**Subagent/command (optional capability, § C)** — all three must be true:
1. **Multi-step** — the task is ≥2 sequential steps, or requires synthesizing information from more than one source (not just "read a convention, then write code by hand").
2. **Repeated** — found ≥2 times in a deep scan, or belongs to a category of action that happens on every instance of its kind (every commit, every PR, every migration) even from a single observed example.
3. **Rawan drift** — doing it by hand has enough free variation that two people (or two sessions) would plausibly do it differently.

**Mandatory-dispatch tier** — all of the above, plus at least one of:
4. **Downstream breakage** — skipping it or doing it inconsistently breaks something outside the file being worked on (a stale index, a tool that fails to parse the result, a broken cross-reference/automation).
5. **No-exception cadence** — it happens on literally every instance of its kind, never "only sometimes."

Mandatory-dispatch requires two things when generated:
- The subagent's own frontmatter `description` is written imperatively ("MUST be used for...") so Claude Code auto-triggers it.
- The runtime's context file (`AGENTS.md`, or the runtime-native equivalent for non-Claude-Code targets) gets an explicit rule naming the exact file path: *"Every `<action>` MUST go through the `<name>` subagent (`<path/to/file>`), never do it by hand."* Runtimes with no auto-dispatch mechanism read that file directly as the actual procedure — the AGENTS.md rule is what makes it mandatory for them too, not just documentation.
