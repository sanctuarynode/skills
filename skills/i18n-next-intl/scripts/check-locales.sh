#!/usr/bin/env bash
# check-locales.sh — verify next-intl message files share one key tree.
#
# A key present in one locale but missing in another renders as the literal
# {namespace}.{key} in that locale at runtime. This script makes that a
# checkable, CI-gradable condition instead of a manual diff.
#
# Usage:
#   scripts/check-locales.sh [MESSAGES_DIR]
#     MESSAGES_DIR   directory of <locale>.json files   (default: i18n/messages)
#
# Reference locale is en.json if present, else the first file alphabetically.
# Exits 0 when every locale matches the reference key-for-key; 1 on any
# missing/extra key; 2 on a setup error. Requires jq.

set -euo pipefail

MESSAGES_DIR="${1:-i18n/messages}"

command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 2; }
[ -d "$MESSAGES_DIR" ] || { echo "error: no messages dir: $MESSAGES_DIR" >&2; exit 2; }

mapfile -t FILES < <(find "$MESSAGES_DIR" -maxdepth 1 -name '*.json' | sort)
[ "${#FILES[@]}" -ge 1 ] || { echo "error: no <locale>.json in $MESSAGES_DIR" >&2; exit 2; }

keys() { jq -r 'paths(scalars) | join(".")' "$1" | sort -u; }

# reference = en.json if present, else the first file
REF="${FILES[0]}"
for f in "${FILES[@]}"; do
  [ "$(basename "$f")" = "en.json" ] && REF="$f"
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
keys "$REF" > "$tmp/ref.keys"

status=0
for f in "${FILES[@]}"; do
  [ "$f" = "$REF" ] && continue
  keys "$f" > "$tmp/cur.keys"
  missing="$(comm -23 "$tmp/ref.keys" "$tmp/cur.keys")"
  extra="$(comm -13 "$tmp/ref.keys" "$tmp/cur.keys")"
  if [ -n "$missing" ] || [ -n "$extra" ]; then
    status=1
    echo "✗ $(basename "$f") differs from $(basename "$REF"):"
    [ -n "$missing" ] && echo "$missing" | sed 's/^/    missing: /'
    [ -n "$extra" ]   && echo "$extra"   | sed 's/^/    extra:   /'
  fi
done

[ "$status" -eq 0 ] && echo "✓ all ${#FILES[@]} locale(s) share one key tree (ref: $(basename "$REF"))"
exit "$status"
