# Generator tools

Plans for new tools on `/tools`. One agent implements one file, in the order below. Do not start a later file until the earlier one is merged or the box is checked.

Read [00-shared.md](./00-shared.md) before every file. It overrides a tool file when they disagree about UI, registration, or tests.

## Order

- [x] [10-treasure.md](./10-treasure.md) Treasure Generator
- [x] [20-encounter.md](./20-encounter.md) Encounter Generator
- [x] [30-magic-shop.md](./30-magic-shop.md) Magic Shop
- [x] [40-power-attack.md](./40-power-attack.md) Power Attack Calculator
- [x] [50-weather.md](./50-weather.md) Weather Generator
- [x] [60-demographics.md](./60-demographics.md) Demographics Calculator
- [x] [70-names.md](./70-names.md) Name Generator
- [x] [80-calendar.md](./80-calendar.md) Calendar Generator
- [x] [90-five-room.md](./90-five-room.md) Five Room Dungeon
- [x] [100-dungeon.md](./100-dungeon.md) Dungeon Generator
- [x] [110-treasure-map.md](./110-treasure-map.md) Treasure Map
- [x] [120-town.md](./120-town.md) Town Generator
- [x] [130-world.md](./130-world.md) World Generator
- [x] [140-fractal-world.md](./140-fractal-world.md) Fractal World
- [x] [150-inn.md](./150-inn.md) Inn Generator
- [x] [160-adventure.md](./160-adventure.md) Adventure Generator
- [x] [170-random-tables.md](./170-random-tables.md) Random Tables

## Agent rules

- Implement only the file you were given, plus the shared registration steps in `00-shared.md`.
- Do not rename routes, slugs, or public labels.
- Do not add a tool that is not in this list.
- When the acceptance checklist in your file passes, check the box above and stop.
- Commit only if the user asked for a commit. Suggested subject is in each file. Format: `type(ticket): subject` when a ticket exists, otherwise the subject in the file.
