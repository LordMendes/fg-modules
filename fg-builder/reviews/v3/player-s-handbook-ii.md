# Player's Handbook II
- **Path:** `C:\Users\User\Documents\fg-modules\fg-builder\reviews\v3\Player's Handbook II.mod`
- **Book slug:** `players-handbook-ii`
- **Load ready:** yes
- **Errors:** 0
- **Warnings:** 24
- **Info:** 0
## Record counts
| Category | Count |
|----------|------:|
| class | 5 |
| feat | 106 |
| item | 1 |
| monsters | 3 |
| spell | 125 |

## Spell-class readiness

| Metric | Count |
|--------|------:|
| Spell-related classfeatures | 0 |
| Named `Spells` (FG hook) | 0 |
| Named `Spellcasting` (variant/reference) | 0 |
| Named `Spells per Day` (prestige hook) | 0 |
| `score equal to` in class text | 0 |

## Build warnings (embedded)

- classes/Metamagic Specialist: missing skillranks (no skill_ranks or skill_points parsed)
- classes/Metamagic Specialist: missing classskills (FG will not auto-mark class skills at level 1)

## Warnings

- **[warning]** `class_invalid_save` — Beguiler: Invalid fort save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Beguiler: Invalid ref save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Beguiler: Invalid will save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_no_features` — Beguiler: No classfeatures defined
  - Remediation: Add at least one class feature with level, name, and text.
- **[warning]** `class_invalid_save` — Dragon Shaman: Invalid fort save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Dragon Shaman: Invalid ref save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Dragon Shaman: Invalid will save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_no_features` — Dragon Shaman: No classfeatures defined
  - Remediation: Add at least one class feature with level, name, and text.
- **[warning]** `class_invalid_save` — Duskblade: Invalid fort save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Duskblade: Invalid ref save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Duskblade: Invalid will save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_no_features` — Duskblade: No classfeatures defined
  - Remediation: Add at least one class feature with level, name, and text.
- **[warning]** `class_invalid_save` — Knight: Invalid fort save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Knight: Invalid ref save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_invalid_save` — Knight: Invalid will save: 'Poor'
  - Remediation: Use Good or Bad.
- **[warning]** `class_no_features` — Knight: No classfeatures defined
  - Remediation: Add at least one class feature with level, name, and text.
- **[warning]** `class_missing_field` — Metamagic Specialist: Missing required field: bab
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Metamagic Specialist: Missing required field: fort
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Metamagic Specialist: Missing required field: ref
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_missing_field` — Metamagic Specialist: Missing required field: will
  - Remediation: Rebuild class with complete identity fields.
- **[warning]** `class_no_features` — Metamagic Specialist: No classfeatures defined
  - Remediation: Add at least one class feature with level, name, and text.
- **[warning]** `class_missing_skillranks` — Metamagic Specialist: missing skillranks (no skill_ranks or skill_points parsed)
  - Remediation: Add skillranks as type="number".
- **[warning]** `class_missing_classskills` — Metamagic Specialist: missing classskills (FG will not auto-mark class skills at level 1)
  - Remediation: Add comma-separated classskills string.
- **[warning]** `missing_type_attr` — Talisman of Transference: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
