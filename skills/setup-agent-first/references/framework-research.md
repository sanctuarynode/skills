# Framework convention research

Runs as a sub-step of Phase 3, gated on deep scan (the same gate as domain-specific subagent proposals) — light scan never triggers this, it's too expensive for a fast pass.

## When it runs

For each framework identified from a dependency in a detected metadata file (e.g. `next` in `package.json`, `laravel/framework` in `composer.json`, `django` in `requirements.txt`/`pyproject.toml`, `elysia`, `fastapi`, `actix-web`) — one research pass per distinct framework found, not per file.

## Cache check, first

Before researching, look for `docs/explanation/<framework>-conventions.md` with a version header as its first line: `<!-- framework-research: <name>@<version> -->`. If the file exists and its version matches what the manifest currently declares, reuse it — skip the fetch entirely. If it's missing, or the version differs from what the manifest declares now, treat this as a cache miss and research fresh.

## Researching

Use whichever of WebFetch, WebSearch, or the `context7` MCP tools (`resolve-library-id` + `query-docs`) fits the framework — try context7 first for anything it resolves, since it returns current version-pinned docs directly; fall back to WebFetch/WebSearch for anything context7 doesn't cover. Look specifically for: canonical project/folder structure, routing or module conventions, the framework's own testing convention, and any idiomatic pattern the framework's own docs call out as "the way to do X" (e.g. Next.js App Router server actions, Laravel's `app/Http/Controllers` + form request validation, Django's app-per-feature layout).

## Writing the cache file

Write `docs/explanation/<framework>-conventions.md` with the version header described above, the framework name/version, the source(s) consulted (URLs or context7 library ID), the date, and a short bulleted summary of the canonical structure/best-practices found. This file is itself a `docs/explanation/` doc — index it in `docs/README.md` like any other doc this skill generates.

## The cross-check rule — never skip this

Research output is a **hypothesis about what to look for**, never a proposal by itself. Before any doc/subagent/command gets proposed from a research finding, Phase 3's actual code-read pass must confirm the pattern is genuinely present and used in *this* repo. A framework convention the research turned up that this repo doesn't actually follow is not a finding — don't propose docs or a subagent for it. This is the same rule as SKILL.md's § Deriving, not templating, applied to research findings instead of another project's output.
