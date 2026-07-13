# Complete Warrior
- **Path:** `C:\Users\User\Documents\fg_modules\reviews\v1\Complete Warrior.mod`
- **Book slug:** `complete-warrior--61`
- **Load ready:** yes
- **Errors:** 0
- **Warnings:** 25
- **Info:** 1
## Record counts
| Category | Count |
|----------|------:|
| class | 41 |
| feat | 95 |
| spell | 8 |

## Build warnings (embedded)

- classes/Cavalier: unknown class skill name(s) for FG ruleset: royalty)
- classes/Invisible Blade: unknown class skill name(s) for FG ruleset: Innuendo
- classes/Kensai: unknown class skill name(s) for FG ruleset: royalty)
- classes/Knight Protector: unknown class skill name(s) for FG ruleset: royalty)
- classes/Paladin Variant: missing skillranks (no skill_ranks or skill_points parsed)
- classes/Paladin Variant: missing classskills (FG will not auto-mark class skills at level 1)
- classes/Ranger Variant: missing skillranks (no skill_ranks or skill_points parsed)
- classes/Ranger Variant: missing classskills (FG will not auto-mark class skills at level 1)
- classes/Ronin: unknown class skill name(s) for FG ruleset: royalty)
- classes/Samurai: unknown class skill name(s) for FG ruleset: royalty)

## Warnings

- **[warning]** `class_unknown_skill` — Cavalier: unknown class skill name(s) for FG ruleset: royalty)
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_malformed_classskills` — Cavalier: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_unknown_skill` — Invisible Blade: unknown class skill name(s) for FG ruleset: Innuendo
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_unknown_skill` — Kensai: unknown class skill name(s) for FG ruleset: royalty)
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_malformed_classskills` — Kensai: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_unknown_skill` — Knight Protector: unknown class skill name(s) for FG ruleset: royalty)
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_malformed_classskills` — Knight Protector: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
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
- **[warning]** `class_unknown_skill` — Ronin: unknown class skill name(s) for FG ruleset: royalty)
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_malformed_classskills` — Ronin: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_unknown_skill` — Samurai: unknown class skill name(s) for FG ruleset: royalty)
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_malformed_classskills` — Samurai: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.

## Info

- **[info]** `class_legacy_skill` — Invisible Blade: Legacy/optional 3.5E skill: Innuendo
  - Remediation: Manually select class skills in FG if using optional rules.
