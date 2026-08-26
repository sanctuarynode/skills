---
name: setup-agent-first
description: Setup repo as agent-first docs - bootstraps or retrofits a repository with AGENTS.md, structured how-to/reference/explanation docs, an ADR convention, and an optional automation layer, so AI coding agents can work in it without per-session hand-holding.
disable-model-invocation: true
argument-hint: "project description - required for an empty repo; omit for an existing repo"
---

# setup-agent-first

## Overview

Walks into any repo — fresh or already partially set up — and leaves it with an accurate, stack-derived agent-first setup: `AGENTS.md`, structured docs, an ADR convention, and (opt-in) subagents/commands/tooling. Never auto-triggers — the user runs it deliberately, because it writes files and installs tooling across their repo.

Two things this skill must get right, and they need opposite treatment:

1. **The consent gate before executing** (§ Consent gate below) — a discipline problem. Baseline testing showed agents skip it under time pressure. Treat it as a hard rule with no exceptions.
2. **Deriving proposals from the target repo's actual stack instead of templating** (§ Deriving, not templating) — a technique problem. Baseline testing showed agents already do this correctly when they bother to look; the failure mode is skipping the *look*, not corrupting the output once they've looked. Treat it as a checklist, not a prohibition.

## When to use

Only on explicit invocation — `/setup-agent-first`, or the user directly asking to set this up. Never infer it from "clean up this repo" or "add some docs."

## The five phases

Run in order, numbered 1–5. Every phase depends on the one before it — don't skip ahead.

### Phase 1 — Cheap detection (always, no question asked)

**Empty-project gate, first.** If the repo has zero signal — no README, no manifest/package file, no source files — AND no project description was passed as an argument, there is nothing for detection to work from. Stop before doing anything else and ask the user what the project is about (purpose, intended stack if known, domain). This is a plain conditional, not a judgment call: no argument + no discoverable files = stop and ask, every time.

If the answer is too thin to seed even the documentation layer (e.g. "a web app" with no stack, no purpose, no domain named), ask a follow-up naming specifically what's still missing — don't guess at a stack or domain to fill the gap. Keep asking until there's enough to at least run Phase 2 meaningfully: a named purpose, and either a chosen/known stack or an explicit "not decided yet" (which is itself usable — it means skip stack-derived proposals in Phase 4 and only offer the stack-agnostic parts of the documentation layer).

Skip this gate entirely the moment the repo has *any* signal (a README, a manifest, source files) or an argument was passed — go straight to the cheap pass below.

Once past the gate, gather facts:

- Existing agent-context files: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`/`.cursorrules`, `.github/copilot-instructions.md`.
- `README.md` + manifest (`package.json`/lockfile or language equivalent) → stack, package manager, monorepo tool.
- Existing `docs/` — does it already resemble how-to/reference/explanation, or something else?
- **Every other README in the tree, not just the root one** — glob for `README.md`/`readme.md` a few levels into `app/`, `src/`, `services/`, `packages/`, or whatever top-level source dirs exist. Each one found is a candidate reference doc — see Phase 4 §A, "Existing module READMEs." Missing one of these is exactly the bug this line exists to prevent: a module README that never gets indexed or pointed to from anywhere.
- Lint/format/typecheck tooling actually configured — a config file on disk (`.eslintrc.json`, `oxlint.config.ts`, etc.) or the equivalent block in `package.json`/language manifest, plus the exact scripts that run them. This alone is enough to propose the `polish` subagent in Phase 4 § C, even on a light scan — no code read required.
- Test runner actually configured.
- Existing CI config, existing husky/pre-commit config.
- Whether `codegraph` is on PATH, whether `.codegraph/` exists.
- **Complexity signals**, used only to shape Phase 2's recommendation: how many top-level service/module/app directories exist, how many sub-READMEs turned up above, whether the manifest implies multiple independent subsystems (e.g. a worker/pipeline alongside a web app). This is still a cheap, glob/listing-level pass — not a code read.

**Idempotency check, right here:** if `AGENTS.md` + a docs index both already exist, this is an **update run**, not a fresh setup — branch to a short "what changed since last setup?" interview (new docs to index, new candidate subagents, stale entries to prune) instead of Phase 2–4's full flow. This is the direct fix for doc-index drift: a prior setup that goes stale gets caught the next time this skill runs, instead of silently rotting.

### Phase 2 — Scan-depth question (first thing asked, before anything else — after the empty-project gate, if it fired; via AskUserQuestion, never skippable — see § Questions are never skippable)

One question: **light scan** (Phase 1's facts only — fast, sufficient for docs + AGENTS.md + agent-context files + tooling opt-ins on a simple/single-purpose repo, and *does* still get you the `polish` subagent — see Phase 4 §C) or **deep scan** (dispatches sub-agents to actually read code — the only path to a `test`/`docs-sync`/domain-specific subagent or command proposal, since those come from patterns found by actually reading code, not from Phase 1's detection-level facts, AND is what makes `domain-model.md` genuinely cover the repo instead of only what the root README happens to mention).

**The recommended default is computed, not fixed to light.** If Phase 1's complexity signals found multiple service/module directories, multiple sub-READMEs, or an implied multi-subsystem architecture (a pipeline/worker alongside a web app, for instance), recommend deep scan — a light scan on a repo like that reliably produces a thin `domain-model.md` that only reflects the root README, silently missing whole subsystems the root README never mentioned. On a small, single-purpose repo, light stays the recommendation. Either way this stays a question, never a silent choice — state the *reason* for the recommendation in the question so the user isn't just seeing "deep (recommended)" with no context.

**Whichever option is computed, label it `(recommended)` right in the option text** (e.g. "Deep scan (recommended)"), not just explained in prose above the question — a user skimming the options should see the recommendation without reading the reasoning first.

**Note the cost tradeoff in the question itself:** deep scan dispatches multiple sub-agents and reads real code, so it spends meaningfully more tokens than the cheap pass. Say so plainly when recommending it, so the choice is actually informed and not just "more thorough sounds better."

### Phase 3 — Run the selected scan

Light → nothing further; `domain-model.md` and the "Working with an agent" section content in Phase 4 comes from Phase 1's facts alone (root README, manifest, top-level directory names). Deep → dispatch scan sub-agents in parallel; collect two things, not one: a candidate list of subagent/command proposals (each with a one-line justification, e.g. "12 routes repeat the same auth-gating check"), AND a per-subsystem summary (one or two sentences of what each top-level service/module actually does) that Phase 4 uses to write a `domain-model.md` that covers the whole repo, not just what the root README happened to mention.

### Phase 4 — Category selection (one batched question, via AskUserQuestion, never skippable — see § Questions are never skippable)

Full catalog, pre-fill/pre-check options from Phase 1/3 findings: **[`references/category-catalog.md`](references/category-catalog.md)**. Covers documentation layer, agent-context files, the automation layer (capabilities not templates — see below), and tooling opt-ins (husky/CI/docs-drift-check as three *independent* checkboxes, never bundled).

**Every checkbox group in this batch — every one, no exceptions — includes an explicit "None of these" option from the start**, and CodeGraph is always one of the automation-layer checkboxes offered, every run. Both are easy to drop by accident: CodeGraph because it isn't stack-derived like the others, so it doesn't surface naturally while writing the rest of the batch from scan findings; "None" because every other option in a group looks like something to propose, not something to *not* propose. Before sending the batch, check every group against the catalog file — a group with fewer options than the catalog lists is missing something, not a legitimate trim. Never re-ask a group just to add the "None" option after the fact — that's the sign it was missing the first time, not a normal second round.

For the "Working with an agent" section content and the AGENTS.md ADR-convention paragraph, use **[`references/templates.md`](references/templates.md)**.

**Domain-model completeness check — required before this doc is considered done.** `domain-model.md`'s entity list must name every top-level service/module directory Phase 1 found, not just the one(s) the root README described. Before finalizing it:
1. Cross-check the draft against Phase 1's directory/sub-README list — any top-level service with no mention at all is a gap.
2. For a gap where Phase 3 ran deep and already summarized that subsystem, fill it from that summary — no extra step needed.
3. For a gap with no deep-scan summary available (light scan was chosen, or deep scan didn't cover it), don't guess at what the subsystem does from its name alone. Ask the user directly, naming the specific gap: *"`<directory>` doesn't show up in the docs anywhere — what does it do?"* Keep asking, one gap at a time or batched, until every top-level service is either covered or explicitly marked out-of-scope by the user.
This is a checklist against an observable fact (every directory named or not), not a judgment call — treat a `domain-model.md` that silently omits a whole subsystem as unfinished, not as an acceptable "light" version.

### Phase 5 — Plan, stop, execute, clean up

1. Write a persisted plan file at the target repo's root (`agent-first-setup-plan.md`) listing every concrete action by path/name. Template: [`references/templates.md`](references/templates.md#plan-file). This file is what lets a later re-invocation resume after an interrupted run instead of restarting the interview.
2. **Stop. See "Consent gate" below — this is not optional.**
3. On explicit go, execute step by step, checking off the plan file as each item lands.
4. On successful completion, delete the plan file. Its only job was surviving interruption.

## Consent gate — no execution without it

**A user's permission to move fast, given before the plan exists, is not consent to the plan.** The stop happens after the plan file is written, every single run — including when the user has already said "just go," "I trust you," "don't stop and ask me things," or anything in that family, *before* the plan existed to be approved.

The stop is one message: a short summary of the plan, ending on this exact line, unmodified:

> Plan set, should we continue?

Then wait. Do not execute Phase 5 step 3 until a message arrives *after* the plan file was written that says to proceed.

**No exceptions:**
- Don't skip the stop because the user pre-authorized speed earlier in the conversation.
- Don't treat "the plan file is sitting right there" as a substitute for the user actually responding to it — an unread file is not consent.
- Don't shorten or paraphrase the confirmation line — say it exactly, so it's recognizable as the actual gate and not just closing chatter.
- Don't reason that re-asking counts as "babysitting" — one line and one wait is not the thing the user was impatient about.

| Rationalization | Why it doesn't hold |
|---|---|
| "They already said just go, don't stop" | That consent predates the plan — it authorized speed once running, not skipping the one checkpoint that shows *what* is about to run. |
| "Re-asking is the babysitting they told me to skip" | A single line + wait, once, after the plan exists, is not per-step babysitting. It's the only gate in the whole flow. |
| "I'll execute now, they can undo what they don't like" | Some of this is easy to undo (a doc file); some isn't (an installed pre-commit hook, a CI workflow live on their next push, an installed subagent they didn't ask for). Undo-ability is not yours to bet on. |
| "They seem impatient, asking again will annoy them" | The plan didn't exist when they expressed impatience. Show them what actually changed since then. |

**Red flags — if you notice any of these, stop and go back to the gate:**
- About to run Phase 5 step 3 without a message received *after* the plan file was written.
- Treating something the user said before Phase 5 step 1 as satisfying the gate.
- About to paraphrase or drop the "Plan set, should we continue?" line.

## Questions are never skippable, even on explicit instruction

Phase 2's scan-depth choice and Phase 4's category-selection batch are both asked through the **AskUserQuestion tool**, every run. **An explicit instruction to skip that tool call — "run directly, no AskUserQuestion," "don't ask, just decide and go," "pick for me" — does not authorize skipping it.** These questions decide what gets written into someone else's repo (scan cost, which docs/agent-context files/subagents/CI get created); deciding that silently is the skill guessing, not the skill being efficient.

If the user has already stated a real answer inline ("do a deep scan" / "just add AGENTS.md and docs"), capture that as their intended selection — but still route it through the AskUserQuestion call as the pre-filled choice for them to confirm, rather than skipping the call because the answer already seems known.

| Rationalization | Why it doesn't hold |
|---|---|
| "They explicitly said skip AskUserQuestion, honor that" | That instruction is about *how* this skill runs, but the questions it's asking to skip are decisions about *their repo* — scan cost, what gets installed. Skipping the tool doesn't remove the decision, it just makes the skill guess instead of asking. |
| "They already told me the answer, asking again is redundant" | Capture their stated answer as the pre-filled selection and still send it through the tool — that's confirming, not re-litigating. |
| "Asking will annoy them, they were clear" | One AskUserQuestion call per phase, twice total in the whole flow, is not the babysitting they're pushing back on. |
| "This is just a config knob, not a big decision like Phase 5" | Scan depth changes token cost and what Phase 3 can find; category selection controls which tooling, subagents, and CI get installed. Same class of decision the consent gate protects, just earlier in the flow. |

**Red flags — if you notice any of these, stop and use the tool:**
- About to reach Phase 2 or Phase 4 without an AskUserQuestion call because the user said to skip it.
- Treating a user's inline answer as sufficient on its own, with no tool call to confirm it.
- About to silently pick scan depth or categories because the user seemed impatient or already answered once.

## Deriving, not templating

Every stack-facing artifact (the `polish` capability, the `test` capability, husky/CI commands) is generated from what Phase 1/3 actually found in *this* repo — never copied from another project you've set this up for before. If Phase 1 found `eslint` + `prettier` + `vitest` + `npm`, that's what goes in the generated files; not `oxlint`/`oxfmt`/`bun test`/`bun` just because that's what a prior run used.

Checklist before writing any stack-facing file:
- [ ] Named the actual tool (not a generic placeholder, not a different project's tool)
- [ ] Used the actual script/command Phase 1 found (not an assumed convention like `npm run lint` when the repo actually uses `npm run check:lint`)
- [ ] Referenced the actual config file path if one exists (`.eslintrc.json`, `oxlint.config.ts`, etc.) so the generated agent treats it as authoritative
- [ ] Didn't add a capability the scan gave no evidence for (e.g. a monorepo-fanout typecheck loop when the target isn't a monorepo)

Worked example: [`references/polish-agent-example.md`](references/polish-agent-example.md) — the `polish` subagent generated for a target repo using eslint/prettier/vitest/npm, derived from a reference project that used oxlint/oxfmt/bun test/bun. Same capability, different tools, nothing copy-pasted.

## Automation layer targets any runtime, not just Claude Code

Subagents and commands are offered for **every runtime targeted in Phase 4 §B**, not gated to Claude Code being one of them. `.claude/agents/*.md` + `.claude/commands/*.md` is the reference shape this skill knows well — it is not the only supported format, just the example to reason from.

For each targeted runtime:
1. Start from **[`references/agent-runtime-shapes.md`](references/agent-runtime-shapes.md)** — a starting reference for Claude Code, Cursor, Codex, OpenCode, Antigravity, Gemini CLI, and GitHub Copilot's known subagent/command file shapes.
2. That table is a hypothesis, not settled fact — it's explicitly flagged as unconfirmed in two spots and can drift as these tools update. Verify against the runtime's own current documentation before generating anything, especially for a runtime not in the table at all or a row it flags as unconfirmed. Don't assume any runtime mirrors Claude Code's shape just because it's the most familiar one; that's the same derive-don't-template mistake § Deriving, not templating warns about, applied to the file's *shape* instead of its stack-facing content.
3. Generate the same capability (`polish`, `test`, etc.) in that runtime's native format, still derived from Phase 1/3's findings for stack-facing content.
4. If a targeted runtime genuinely has no equivalent concept (no custom-agent or custom-command mechanism at all — e.g. Codex's command file, per the reference table), say so plainly and skip generating that capability for that runtime specifically — don't force a fake equivalent, and don't silently drop it without mentioning it.
5. Never route an automation-layer capability into that runtime's rules/instructions file (`.cursor/rules/*.mdc`, `.github/instructions/**/*.instructions.md`, `AGENTS.md`, etc.) — those are the context files Phase 4 §B already handles, not a command/subagent mechanism, even where a runtime has no separate command concept of its own.

This mirrors how CodeGraph already behaves (§ CodeGraph below) — it auto-detects and wires itself into whichever runtimes are present instead of assuming Claude Code's shape is universal.

## Appending, not overwriting, AGENTS.md

If `AGENTS.md` already exists, never ask whether to modify it in place or append — always append. Whatever the user already wrote stays exactly as it is; this skill only ever adds to it.

Wrap everything this skill writes inside `<!-- SETUP-AGENT-FIRST:START -->` / `<!-- SETUP-AGENT-FIRST:END -->` markers, appended at the end of the file. Never touch a line outside those markers. On a later run (update mode), replace only the content between the existing markers — don't duplicate a second block.

If `AGENTS.md` doesn't exist yet, write it fresh with the same markers around the generated content, so the convention is identical either way and a future run finds the markers regardless of which path created the file.

**Don't duplicate what's already outside the markers.** Before writing content into the block, check whether the existing `AGENTS.md` already covers it elsewhere in the file — e.g. it already has an ADR-process paragraph, or already documents the doc-folder structure. If it does, don't restate it inside the marker block; the marker block only carries what's genuinely missing.

**Every sync re-checks that coverage, not just the marker block's own content.** On an update run, re-read the whole file, not just what's between the markers: something the user's own content used to cover might have been edited out or gone stale since the last run. Anything this skill stands for that the file as a whole no longer covers goes back into the marker block.

## CodeGraph

Offered as a single checkbox in the automation layer, regardless of which runtimes are targeted — it isn't gated by Claude Code being one of them, unlike the runtime-specific subagent/command generation the rest of the group needs (see § Automation layer targets any runtime). Its question description states plainly that choosing it means CodeGraph gets installed and initialized for this project with no further confirmation. At execution time: install `codegraph` if missing, then run `codegraph init` and `codegraph install` and trust its own per-agent wiring — it already auto-detects and configures 9+ agent runtimes (MCP registration where supported, a CLI-fallback block in that agent's instructions file where not). Don't reimplement any part of that.

## Out of scope

- Hosted/SaaS doc-generation integration — local/git-native only.
- Actual ADR tooling — only the convention paragraph goes into `AGENTS.md`; the agent that reads it writes real ADRs later, when a real decision arises.
