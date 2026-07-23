# Book of Exalted Deeds
- **Path:** `C:\Users\User\Documents\fg_modules\fg-builder\reviews\v1-staging\Book of Exalted Deeds.mod`
- **Book slug:** `book-of-exalted-deeds--52`
- **Load ready:** yes
- **Errors:** 0
- **Warnings:** 104
- **Info:** 0
## Record counts
| Category | Count |
|----------|------:|
| class | 22 |
| feat | 53 |
| item | 56 |
| race | 1 |
| spell | 121 |

## Spell-class readiness

| Metric | Count |
|--------|------:|
| Spell-related classfeatures | 16 |
| Named `Spells` (FG hook) | 6 |
| Named `Spellcasting` (variant/reference) | 0 |
| Named `Spells per Day` (prestige hook) | 10 |
| `score equal to` in class text | 6 |

## Build warnings (embedded)

- classes/Apostle of Peace: unknown class skill name(s) for FG ruleset: engineering), royalty)
- classes/Emissary of Barachiel: unknown class skill name(s) for FG ruleset: engineering), royalty)
- classes/Exalted Arcanist: missing classskills (FG will not auto-mark class skills at level 1)
- classes/Sentinel of Bharrai: unknown class skill name(s) for FG ruleset: Alchemy, engineering), royalty)
- classes/Skylord: unknown class skill name(s) for FG ruleset: engineering), royalty)
- classes/Troubadour of Stars: unknown class skill name(s) for FG ruleset: engineering), royalty)
- classes/Vassal of Bahamut: unknown class skill name(s) for FG ruleset: royalty)

## Warnings

- **[warning]** `class_malformed_classskills` — Apostle of Peace: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_malformed_classskills` — Emissary of Barachiel: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_missing_classskills` — Exalted Arcanist: missing classskills (FG will not auto-mark class skills at level 1)
  - Remediation: Add comma-separated classskills string.
- **[warning]** `class_unknown_skill` — Sentinel of Bharrai: unknown class skill name(s) for FG ruleset: Alchemy
  - Remediation: Verify skill exists in 3.5E ruleset or optional supplement module.
- **[warning]** `class_malformed_classskills` — Sentinel of Bharrai: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_malformed_classskills` — Skylord: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_malformed_classskills` — Troubadour of Stars: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_malformed_classskills` — Vassal of Bahamut: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `spell_missing_field` — Aspect of the Deity: Missing required field: castingtime
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity: Missing required field: range
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity: Missing required field: duration
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity, Greater: Missing required field: castingtime
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity, Greater: Missing required field: range
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity, Greater: Missing required field: duration
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity, Greater: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity, Greater: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity, Lesser: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Aspect of the Deity, Lesser: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Blessed Sight: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Blessed Sight: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Blinding Beauty: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Blinding Beauty: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Channel Greater Celestial: Missing required field: castingtime
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Channel Greater Celestial: Missing required field: range
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Channel Greater Celestial: Missing required field: duration
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Channel Greater Celestial: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Channel Greater Celestial: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Divine Sacrifice: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Divine Sacrifice: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Eladrin Form: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Eladrin Form: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Path of the Exalted: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Path of the Exalted: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Quickshift: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Quickshift: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Radiant Shield: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Radiant Shield: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Righteous Glare: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Righteous Glare: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Shield of the Archons: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Shield of the Archons: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Smite Heretic: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Smite Heretic: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Unearthly Beauty: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Unearthly Beauty: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `missing_type_attr` — Angelic: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Antimagic Shackles: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Asura Shield: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Banishing: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Barsolidor, the Tyrant Bane: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Blessed: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Bow of the Solars: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Caduceus: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Celestial Blade: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Celestial Mace: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `item_missing_cost` — Cup and Talisman of Al’Akbar: Missing cost field
  - Remediation: Add cost string from scraped price.
- **[warning]** `missing_type_attr` — Dart of the Phoenix: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Demondoom: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Devilhusk: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Empyreal: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Enfeebling: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Exalted: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `item_missing_cost` — Ezrylon: Missing cost field
  - Remediation: Add cost string from scraped price.
- **[warning]** `missing_type_attr` — Ezrylon: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Hellpiercer: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Hwyrr, the Clarion Harp: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Iasalas, the Watershod: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Incense of Consecration: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Lunistra, the Heartstar: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Nightblade of Arvandor: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Paralyzing: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Redeemed Darkskull: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Redeemed Demon Armor: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Redeemed Mace of Blood: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `item_missing_cost` — Redeemed Nine Lives Stealer: Missing cost field
  - Remediation: Add cost string from scraped price.
- **[warning]** `missing_type_attr` — Redeemed Nine Lives Stealer: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Redeemed Robe of the Archmagi: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Redeemed Rod of the Viper: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Redeemed Unholy Weapon: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Retributive Amulet: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Righteous: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Ring of Adamantine Touch: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Ring of Affliction: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Ring of Solar Wings: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Ring of Vengeance: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Roaring: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Sacred: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Seryl, the Laughing Bow: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Shackles of Silence: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Soulfire: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Staff of Rapture: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Starmantle Cloak: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Sunstaff: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `item_missing_cost` — The Regalia of Good: Missing cost field
  - Remediation: Add cost string from scraped price.
- **[warning]** `missing_type_attr` — Thurible of Consecration: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Torvion, the Fifth Shield: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Trumpet of Doom: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Trumpet of Healing: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Twilight: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Vambraces of Evil’s Warding: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Vassal Armor: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
- **[warning]** `missing_type_attr` — Zaethwar, the Sinflayer: Field 'cl' should have type="string"
  - Remediation: Add type attributes per FG export conventions.
