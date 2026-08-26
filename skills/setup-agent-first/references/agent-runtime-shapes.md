# Known agent-runtime shapes

Starting reference for Phase 4 §C (automation layer: subagents/commands) and, where relevant, §B (agent-context/"rules" files). **Not guaranteed current** — runtime vendors change these paths. Per SKILL.md § Automation layer targets any runtime, verify against the runtime's own current docs before generating a file for it; treat this table as a hypothesis to confirm, not settled fact, especially for the two gaps flagged below.

| Runtime | Subagent file | Command file | Context/"rules" file (handled in §B, not an automation-layer artifact) |
|---|---|---|---|
| Claude Code | `.claude/agents/*.md` | `.claude/commands/*.md` | `CLAUDE.md` |
| Cursor | `.cursor/agents/*.md` | `.cursor/commands/*.md` | `.cursor/rules/*.mdc` |
| Codex | `.codex/agents/*.toml` | ⚠️ no confirmed dedicated command-file format as of this writing — verify current docs; if none exists, skip generating a command artifact for Codex and say so plainly rather than guessing a path | `AGENTS.md` (no separate rules file) |
| OpenCode | `.opencode/agents/*.md` | `.opencode/commands/*.md` | `AGENTS.md` (no separate rules file) |
| Antigravity | `.agents/agents/*.md` — inferred from the `.agents/<category>/` pattern (rules, workflows both confirmed there); not directly confirmed in docs, verify before relying on it | `.agents/workflows/*.md`, invoked as `/<name>` | `.agents/rules/*.md` |
| Gemini CLI | `.gemini/agents/*.md` — **Markdown, not TOML** | `.gemini/commands/*.toml` — TOML | `GEMINI.md` |
| GitHub Copilot | `.github/agents/<name>.agent.md` | `.github/prompts/*.prompt.md` — **IDE surfaces only** (VS Code, Visual Studio, JetBrains); not supported in the Copilot CLI as of this writing | `.github/instructions/**/*.instructions.md` |

## Notes

- **The rules/instructions column is never a command-equivalent.** Every runtime's rules/instructions file is a persistent context file — the same role this skill's own generated pointer files fill in Phase 4 §B. Don't route automation-layer capabilities (`polish`, `test`, etc.) into a rules file; those go in the command/subagent file for that runtime.
- **Two gaps are flagged above** (Codex commands, Antigravity's exact agent path) — confirm against the runtime's current docs before generating either. If Codex genuinely has no command mechanism, that's a real "no equivalent" case per SKILL.md § Automation layer targets any runtime step 4 — skip it and say so, don't invent a path.
- **GitHub Copilot's command-equivalent depends on the target surface.** If the repo's Copilot usage is CLI-based rather than an IDE, prompt files aren't supported yet — fall back to the "no equivalent, say so, skip" rule for that target specifically.
- This table can go stale as these tools update. Re-verify rather than trusting it blindly on a codebase encountered long after it was written.
