---
name: i18n-next-intl
description: Keep next-intl translations in sync across every locale. Use whenever you add or change a user-facing string — a new t("...") call, a useTranslations namespace, a toast, a button or form-field label, a dialog title/description, or an error message. next-intl ships one JSON message file per locale; touch one locale and the others render the literal {namespace}.{key} at runtime.
---

# next-intl: keep every locale in sync

A next-intl app stores one JSON message file per locale — commonly `i18n/messages/<locale>.json` (`en.json`, `id.json`, `fr.json`, …; your exact path may differ). **Every locale file must have the same key tree.** A key present in one locale but missing in another renders as the literal `{namespace}.{key}` string in that locale at runtime.

## The rule

**Every time you add or modify a translation key, edit it in EVERY locale file in the same change. Never one without the others.**

This applies to:

- Adding a new `t("some.key")` call in any component
- Adding a `useTranslations("<namespace>")` namespace
- Adding a `<FormField>` label, placeholder, or description
- Adding a `toast.success(...)` / `toast.error(...)` message
- Adding a dialog/sheet title or description
- Any string a user will see

## Where keys live

Flat JSON with nested namespaces:

```json
{
  "common": { "save": "...", "cancel": "..." },
  "auth": {
    "welcomeBack": "...",
    "invite": { "title": "...", "completing": "..." }
  },
  "nav": { "dashboard": "...", "settings": "..." }
}
```

When adding a key:

1. **Pick the namespace path** by matching neighboring features — admin pages under `admin.<page>`, nav labels under `nav.*`, auth flow under `auth.*`, etc. Consistency beats cleverness.
2. **Add the same path to every locale file.**
3. **Variables** use the ICU placeholder convention: `"Welcome, {name}"` called as `t("greet", { name })`. Plurals/selects use ICU syntax (`{count, plural, one {# item} other {# items}}`).

## Every visible string is a key

Not just body copy — button labels, placeholders, titles/descriptions, `aria-label`s, empty-state copy, and toast messages are all translation keys, never hardcoded literals.

- **Server components** use `getTranslations`; **client components** use `useTranslations`.
- Generic action labels (Edit, Delete, Cancel, Save, …) belong in a shared `common` namespace — reuse the existing key (e.g. `tc("edit")`) instead of re-adding a near-duplicate per feature.

## Per-locale translation notes

- Keep product names, brand names, and proper nouns **untranslated**; translate the surrounding copy only.
- Action labels stay short verbs. Match the tone (formal vs casual) already used in the closest sibling keys for that locale.
- Leave date/number **format** strings alone — only translate label text around them. For the values themselves, prefer next-intl's `useFormatter` (`format.dateTime`, `format.number`) over hand-formatting.
- Project-specific glossaries (preferred term for "tenant", "branch", domain nouns) belong in the consuming repo, not here — keep one and link to it so locales stay consistent.

## After editing

next-intl doesn't type-check key existence by default. If you wire up a typed-messages augmentation (declare the message shape against next-intl's `AppConfig` in a `global.d.ts`), the build flags unknown keys at compile time — set that up for compile-time safety.

## Verify nothing is missing

A key present in one locale but not another is a shipping bug. Run the bundled check — it diffs every locale's key tree against the reference (en.json, or the first file) and exits non-zero on any missing/extra key:

```bash
scripts/check-locales.sh [MESSAGES_DIR]   # default MESSAGES_DIR: i18n/messages
```

A clean run is the completion criterion — don't ship on a non-empty diff. To also catch keys referenced in source but never defined, grep them out (`grep -roh 't("[^"]\+"' src | sort -u`) and eyeball against a locale file — this is a heuristic, since `useTranslations("ns")` makes `t("key")` resolve to the full path `ns.key`.
