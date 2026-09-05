# Canonical project metadata sources

Starting reference for Phase 1's metadata/monorepo detection — like `agent-runtime-shapes.md`, this is a hypothesis to extend, not a closed list. If a repo has a manifest-shaped file for an ecosystem not listed here, still treat it as a metadata source using your own knowledge of that ecosystem — never skip a real signal just because it isn't in this table.

## Per-ecosystem metadata files

| Ecosystem | Primary metadata file(s) | Workspace/monorepo signal |
|---|---|---|
| Node/JS/TS | `package.json` + lockfile (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`) | `workspaces` field in `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json` |
| PHP | `composer.json` | usually surfaces as multiple `composer.json` in sibling dirs rather than a single-file workspace signal |
| Python | `pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py` | multiple `pyproject.toml` in sibling dirs; `[tool.uv.workspace]` in `pyproject.toml` |
| Go | `go.mod` | `go.work` (Go workspace file) |
| Rust | `Cargo.toml` | `[workspace]` section in root `Cargo.toml` listing `members` |
| Ruby | `Gemfile` | multiple `Gemfile`s in sibling dirs |
| Dart/Flutter | `pubspec.yaml` | melos workspace config, or multiple `pubspec.yaml` in sibling dirs |
| .NET | `*.csproj`, `*.sln`, `global.json`, `Directory.Build.props`; `appsettings.json` as a config signal (not a manifest, but confirms an ASP.NET/.NET runtime) | a `*.sln` referencing multiple `*.csproj` projects |
| Kotlin/Android/Gradle | `build.gradle`/`build.gradle.kts`, `settings.gradle`/`settings.gradle.kts`, `libs.versions.toml` (Gradle version catalog) | `settings.gradle(.kts)` listing multiple `include(...)` modules, or multiple nested `build.gradle(.kts)` |
| Swift | `Package.swift` | multiple `Package.swift` in sibling dirs |
| Elixir | `mix.exs` | umbrella project (`apps/*/mix.exs` under one root `mix.exs`) |
| C/C++ | `CMakeLists.txt`, `conanfile.txt`/`conanfile.py` | nested `CMakeLists.txt` pulled in via `add_subdirectory` |
| Deno | `deno.json`/`deno.jsonc` | `workspace` field in `deno.json` |

## How to classify what's found

1. Glob for every file above, root **and nested** a few levels into whatever top-level source dirs the repo actually has (`apps/`, `packages/`, `services/`, `libs/`, `modules/`, etc.) — not just the root.
2. **Monorepo** — a workspace/members signal is present, OR the same ecosystem's metadata file appears in multiple sibling directories.
3. **Polyglot single-repo** — metadata files from *different* ecosystems found at the same level with no workspace/members signal (e.g. a Next.js frontend + a Python worker script colocated). Treat this as multi-stack, not as a monorepo requiring per-package scanning.
4. A file not in this table but shaped like a manifest for a recognizable ecosystem (by name or content) is still a real signal — use it. This table is a starting point to extend by reasoning about the actual ecosystem found, the same way `agent-runtime-shapes.md` treats its own table as unconfirmed in spots.
