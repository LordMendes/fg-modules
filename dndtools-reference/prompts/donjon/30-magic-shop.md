# Magic Shop

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `magic-shop`
- label: Magic Shop
- href: `/tools/magic-shop`
- description: Stock a magic shop from town size, with a keeper and items priced from the compendium.
- source: `DMG`

## Goal

A shop has a name, a location line, a description, a keeper, and a list of items for sale. Each block can be rerolled on its own. Item count depends on town size. Items come from the compendium, not from invented names.

## Town size and stock count

| Town size | Item count |
|---|---|
| Thorp | 1d4 |
| Hamlet | 1d6 |
| Village | 2d4 |
| Small town | 3d4 |
| Large town | 3d4 |
| Small city | 4d4 |
| Large city | 4d4 |
| Metropolis | 6d4 |

DMG gp limit, used as a price ceiling:

| Town size | Max gp |
|---|---|
| Thorp | 40 |
| Hamlet | 100 |
| Village | 200 |
| Small town | 800 |
| Large town | 3000 |
| Small city | 15000 |
| Large city | 40000 |
| Metropolis | 100000 |

Shop types: Trader, Armorer, Weaponsmith, Alchemist, Scribe, Wandwright.

Type filters the item query:

- Armorer: armor and shields.
- Weaponsmith: weapons.
- Alchemist: potions and oils.
- Scribe: scrolls.
- Wandwright: wands and staffs.
- Trader: any magic item under the gp limit.

Match on `Item.itemType` and, if type is empty, on the name. If a filter returns fewer items than the roll, fill from Trader stock under the same gp limit. If the compendium still cannot fill the list, show the shortfall in the item list as "The shop has nothing else in stock."

## Name, place, keeper

Write original tables in `src/lib/magic-shop/flavor.ts`. Do not copy sentences from elsewhere.

- Shop names: about 40 patterns. Some start with "The". Some contain `{keeper}'s` so the keeper's given name can replace the leading name. Example pattern shape: `{keeper}'s Reliquary`, `The Gilded Vial`.
- After the keeper rolls, if the shop name matches `^(.+?)('s .+)$` or `^(.+?)( and .+'s .+)$`, replace the first part with the keeper's given name. Do not rewrite names that start with "The ".
- Locations: 12 short sentences that mention the town size in prose ("a side street in a large town", not the enum key).
- Descriptions: 16 short sentences about the shop interior. No item stats in the description.
- Keepers: 24 sentences. Each includes the words `named {Name}` so the UI can parse the given name with `/named ([^,.\s]+)/`. Race and role should fit the shop type (an alchemist is not described as a smith).

Rerolling the keeper updates the shop name when the pattern uses `{keeper}`. Rerolling the name rolls a new pattern and then applies the current keeper.

## Items

Server action `getShopItems({ townSize, shopType, count, seed })` returns `{ name, slug, price }[]` sorted by name. Price is the compendium `price` string. Skip items with no parseable gp price or with gp above the town limit.

Each item row is the name (linked to `/items/<slug>`), then the price. Scrolls may use the spell name in the item name. Do not append a second generated flavor sentence under the item.

## UI

- Town size and shop type selects. Changing either rerolls all blocks.
- Shop name is a button (`tool-btn--ghost`) that rerolls only the name.
- Four sections, each with its own Reroll button: Location, Description, Keeper, Items.
- Items are an ordered list.
- Seed field. Rerolling one section uses `rng` advanced from `seed + sectionSalt` so other sections stay put. Salts: name 1, location 2, description 3, keeper 4, items 5.
- Class prefix: `.magic-shop`.

## Tests

- Thorp stock count is between 1 and 4 for 30 seeds.
- Metropolis count is between 6 and 24.
- A shop name pattern that contains `{keeper}` and a keeper "named Mira" renders `Mira's ...` and does not keep the placeholder.
- A name starting with "The " is unchanged when the keeper rerolls.
- Armorer results never include an item whose type and name both lack armor and shield, unless the fallback path was used. Test the filter function with a fake list, not the database.

## Acceptance

- `/tools/magic-shop` is on the tools index.
- Each section rerolls alone.
- Item links resolve for a real slug from the database. If the database is empty in dev, the empty state still renders.
- Tests and typecheck pass.

## Suggested commit

`feat(magic-shop): add town magic shop generator`
