# Complete Warrior
- **Path:** `C:\Users\User\Documents\fg_modules\fg-builder\reviews\v1-staging\Complete Warrior.mod`
- **Book slug:** `complete-warrior--61`
- **Load ready:** yes
- **Errors:** 0
- **Warnings:** 15
- **Info:** 1
## Record counts
| Category | Count |
|----------|------:|
| class | 41 |
| feat | 95 |
| spell | 8 |

## Spell-class readiness

| Metric | Count |
|--------|------:|
| Spell-related classfeatures | 9 |
| Named `Spells` (FG hook) | 3 |
| Named `Spellcasting` (variant/reference) | 0 |
| Named `Spells per Day` (prestige hook) | 6 |
| `score equal to` in class text | 3 |

## Build warnings (embedded)

- classes/Invisible Blade: unknown class skill name(s) for FG ruleset: Innuendo
- classes/Paladin Variant: missing skillranks (no skill_ranks or skill_points parsed)
- classes/Paladin Variant: missing classskills (FG will not auto-mark class skills at level 1)
- classes/Ranger Variant: missing skillranks (no skill_ranks or skill_points parsed)
- classes/Ranger Variant: missing classskills (FG will not auto-mark class skills at level 1)

## Warnings

- **[warning]** `class_unknown_skill` — Invisible Blade: unknown class skill name(s) for FG ruleset: Innuendo
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_missing_field` — Paladin Variant: Missing required field: hitdie
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Paladin Variant: Missing required field: bab
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Paladin Variant: Missing required field: fort
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Paladin Variant: Missing required field: ref
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Paladin Variant: Missing required field: will
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_skillranks` — Paladin Variant: missing skillranks (no skill_ranks or skill_points parsed)
  - Remediation: Add skillranks as type="number".
- **[warning]** `class_missing_classskills` — Paladin Variant: missing classskills (FG will not auto-mark class skills at level 1)
  - Remediation: Add comma-separated classskills string.
- **[warning]** `class_missing_field` — Ranger Variant: Missing required field: hitdie
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Ranger Variant: Missing required field: bab
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Ranger Variant: Missing required field: fort
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Ranger Variant: Missing required field: ref
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Ranger Variant: Missing required field: will
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_skillranks` — Ranger Variant: missing skillranks (no skill_ranks or skill_points parsed)
  - Remediation: Add skillranks as type="number".
- **[warning]** `class_missing_classskills` — Ranger Variant: missing classskills (FG will not auto-mark class skills at level 1)
  - Remediation: Add comma-separated classskills string.

## Info

- **[info]** `class_legacy_skill` — Invisible Blade: Legacy/optional 3.5E skill: Innuendo
  - Remediation: Manually select class skills in FG if using optional rules.
