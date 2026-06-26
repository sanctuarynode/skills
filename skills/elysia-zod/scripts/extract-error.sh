#!/usr/bin/env bash
# extract-error.sh — filter a pasted Elysia + Zod 422 log down to the three
# fields that pick the fix, so you skip the full validator schema dump.
#
# Usage:
#   scripts/extract-error.sh server.log     # from a file
#   pbpaste | scripts/extract-error.sh      # from the clipboard / a pipe
#
# Surfaces the lines holding:
#   "customError" / "summary" — the human reason (e.g. expected date, received string)
#   "path"                    — the field that failed (e.g. ["data",0,"createdAt"])
#   "type"                    — "body" (fix the request schema) vs "response" (fix the response schema)
#
# Reading those three against SKILL.md's six cases is enough to pick the fix.
# This only filters; it does not decide. See reference.md for a worked dump.

grep -nE '"(customError|summary|path|type)"[[:space:]]*:' "${1:-/dev/stdin}"
