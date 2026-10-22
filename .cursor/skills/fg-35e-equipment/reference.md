# 3.5E Basic Rules equipment reference

Extracted from `3.5E-basicrules/client.xml` (official Fantasy Grounds 3.5E Essentials module).

## Module layout

```xml
<root version="2.0">
  <library>… library entries for Equipment - Armor / Goods / Weapons …</library>
  <reference static="true">
    <weapon>…item nodes…</weapon>
    <armor>…item nodes…</armor>
    <equipment>…item nodes…</equipment>
  </reference>
  <list static="true">
    <armor>
      <recordtype type="string">item</recordtype>
      <source type="string">reference.armor</source>
      <listview type="string">armor</listview>
    </armor>
    <equipment>
      <recordtype type="string">item</recordtype>
      <source type="string">reference.equipment</source>
      <listview type="string">equipment</listview>
    </equipment>
    <weapons>
      <recordtype type="string">item</recordtype>
      <source type="string">reference.weapon</source>
      <listview type="string">weapon</listview>
    </weapons>
  </list>
</root>
```

In this repo's built modules, `convert_items` writes a flat `<item>` section with category groups. Field names and types must still match the item records below.

Counts in Basic Rules: 73 weapons, 21 armor/shield/extras, 173 goods.

## Weapon examples

### Simple light melee (thrown)

```xml
<dagger>
  <name type="string">Dagger</name>
  <cost type="string">2 gp</cost>
  <weight type="number">1</weight>
  <damage type="string">1d4</damage>
  <critical type="string">19-20/x2</critical>
  <range type="number">10</range>
  <damagetype type="string">Piercing or slashing</damagetype>
  <properties type="string"></properties>
  <type type="string">Weapon</type>
  <subtype type="string">Simple Light Melee</subtype>
</dagger>
```

### Double weapon

```xml
<quarterstaff>
  <name type="string">Quarterstaff</name>
  <cost type="string">-</cost>
  <weight type="number">4</weight>
  <damage type="string">1d6/1d6</damage>
  <critical type="string">x2</critical>
  <range type="number">0</range>
  <damagetype type="string">Bludgeoning</damagetype>
  <properties type="string">Double</properties>
  <type type="string">Weapon</type>
  <subtype type="string">Simple Two-Handed Melee</subtype>
</quarterstaff>
```

### Reach weapon

```xml
<longspear>
  <name type="string">Longspear</name>
  <cost type="string">5 gp</cost>
  <weight type="number">9</weight>
  <damage type="string">1d8</damage>
  <critical type="string">x3</critical>
  <range type="number">0</range>
  <damagetype type="string">Piercing</damagetype>
  <properties type="string">Reach</properties>
  <type type="string">Weapon</type>
  <subtype type="string">Simple Two-Handed Melee</subtype>
</longspear>
```

### Martial one-handed

Typical longsword shape: `damage` `1d8`, `critical` `19-20/x2`, `range` `0`, `damagetype` `Slashing`, empty `properties`, subtype `Martial One-Handed Melee`.

## Armor examples

### Light armor

```xml
<padded>
  <name type="string">Padded</name>
  <cost type="string">5 gp</cost>
  <weight type="number">10</weight>
  <ac type="number">1</ac>
  <maxstatbonus type="number">8</maxstatbonus>
  <checkpenalty type="number">0</checkpenalty>
  <spellfailure type="number">5</spellfailure>
  <speed30 type="number">30</speed30>
  <speed20 type="number">20</speed20>
  <properties type="string"></properties>
  <type type="string">Armor</type>
  <subtype type="string">Light</subtype>
</padded>
```

### Shield

```xml
<buckler>
  <name type="string">Buckler</name>
  <cost type="string">15 gp</cost>
  <weight type="number">5</weight>
  <ac type="number">1</ac>
  <maxstatbonus type="number">0</maxstatbonus>
  <checkpenalty type="number">-1</checkpenalty>
  <spellfailure type="number">5</spellfailure>
  <speed30 type="number">0</speed30>
  <speed20 type="number">0</speed20>
  <properties type="string"></properties>
  <type type="string">Armor</type>
  <subtype type="string">Shield</subtype>
</buckler>
```

### Extras

Armor spikes, locked gauntlet, shield spikes: all `type=Armor`, `subtype=Extras`, combat numbers usually `0`. Costs may be relative (`+50 gp`, `+10 gp`). Locked gauntlet / tower shield use `properties=Special`.

## Goods examples

```xml
<arrows>
  <name type="string">Arrows (20)</name>
  <cost type="string">1 gp</cost>
  <weight type="number">3</weight>
  <type type="string">Goods and Services</type>
  <subtype type="string">Ammunition</subtype>
</arrows>

<chalk>
  <name type="string">Chalk, 1 piece</name>
  <cost type="string">1 cp</cost>
  <weight type="number">0</weight>
  <type type="string">Goods and Services</type>
  <subtype type="string">Adventuring Gear</subtype>
</chalk>
```

## Subtype inventories

### Weapons

| Subtype | Count |
| --- | ---: |
| Simple Unarmed Melee | 2 |
| Simple Light Melee | 5 |
| Simple One-Handed Melee | 4 |
| Simple Two-Handed Melee | 3 |
| Simple Ranged | 5 |
| Martial Light Melee | 10 |
| Martial One-Handed Melee | 10 |
| Martial Two-Handed Melee | 11 |
| Martial Ranged | 4 |
| Exotic Light Melee | 4 |
| Exotic One-Handed Melee | 3 |
| Exotic Two-Handed Melee | 6 |
| Exotic Ranged | 6 |

Nonempty weapon `properties` in Basic Rules: `Double` (6), `Reach` (7).

### Armor

| Subtype | Count |
| --- | ---: |
| Light | 4 |
| Medium | 4 |
| Heavy | 4 |
| Shield | 6 |
| Extras | 3 |

### Goods

| Subtype | Count |
| --- | ---: |
| Adventuring Gear | 66 |
| Ammunition | 3 |
| Clothing | 12 |
| Food, Drink, and Lodging | 14 |
| Mounts and Related Gear | 21 |
| Special Substances and Items | 10 |
| Spellcasting and Services | 16 |
| Tools and Skill Kits | 20 |
| Transport | 11 |

## Adapter mapping notes

`fg_weapon_fields` / `fg_armor_fields` / `fg_goods_subtype` in `wrpg_support.py` map JSON extract records onto these shapes.

When extending goods categories, prefer the exact Basic Rules subtype strings (lowercase "and"). Title-casing a raw category can produce wrong strings such as `Special Substances And Items`.

WRPG-only grips (`Exotic Firearm`) are allowed extensions; keep the grip token (`firearm`) so FG strength rules stay correct.
