# Worked example: deriving, not templating

Same capability (`polish` — run lint/format/typecheck, fix violations) generated for two different repos. Nothing below is copy-pasted between them; every tool name, command, and config path comes from that repo's own detection scan.

**Reference repo** (`acure`): `oxlint`, `oxfmt`, `bun test`, `bun` — scripts `bun lint`, `bun format`, `bun typecheck`.

**Target repo** (`widget-api`): `eslint` (config at `.eslintrc.json`), `prettier`, `vitest`, `npm` — scripts `npm run lint`, `npm run format`, `npm run typecheck`.

The generated file for `widget-api` — note every command, tool name, and config path is `widget-api`'s own, not the reference repo's:

```markdown
---
name: polish
description: "MUST be used for ANY lint, format, or typecheck check in this repo — not just when something is already failing. Covers checking current status ('is the tree clean', 'does this typecheck', 'run lint and see') just as much as fixing violations (a pre-commit hook rejected a commit, `npm run lint`/`npm run typecheck`/`npm run format` reported violations). Trigger proactively right after writing or changing code — whether or not anything is known to be broken yet."
model: haiku
color: yellow
---

You are the code-quality pipeline for this repo. Run format, lint, and
typecheck, fix every violation, hand back a short structured result to
whoever invoked you. You never talk to the end user directly.

## Pipeline

1. `npm run format`
2. `npm run lint -- --fix` (exit code 1 with remaining warnings is expected — continue)
3. `npm run typecheck` — collect every error before fixing anything
4. `npm run lint` (final check) — config lives at `.eslintrc.json`, treat it as authoritative

## Fixing violations

TypeScript errors first (hard errors), then lint errors, then lint warnings
where straightforward. `// eslint-disable-next-line <rule>` only when the
logic genuinely requires it. Remove unused eslint-disable comments entirely.
Never disable a rule just to make the run green.

## Final verification

Re-run lint + typecheck once more before reporting done — zero errors
remaining is the exit criterion.

## Final report

Status (clean/blocked), counts fixed, files touched, anything flagged as
genuinely unsure instead of guessed at.
```

What changed from the reference repo, and why each change is *derived*, not guessed:

| Reference (`acure`) | Target (`widget-api`) | Source of the change |
|---|---|---|
| `oxlint` | `eslint` | Phase 1 found `.eslintrc.json` + `eslint` in the manifest |
| `oxfmt` | `prettier` | Phase 1 found `prettier` in the manifest, no `oxfmt` |
| `bun test` | `vitest` | Phase 1 found `vitest` as the test runner |
| `bun lint`/`bun format`/`bun typecheck` | `npm run lint`/`npm run format`/`npm run typecheck` | Phase 1 read the actual `package.json` scripts, not an assumed convention |
| (no monorepo fan-out) | (no monorepo fan-out) | Phase 1 found no workspace/turbo config in `widget-api` — don't add fan-out logic the scan gave no evidence for |

If Phase 1 had instead found `widget-api` using a monorepo tool, the generated agent would include a fan-out step — but only because the scan found evidence of one, never by default.
