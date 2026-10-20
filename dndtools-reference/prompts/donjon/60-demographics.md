# Demographics Calculator

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `demographics`
- label: Demographics Calculator
- href: `/tools/demographics`
- description: Population, settlements, businesses, and NPC classes for a kingdom and a town, using DMG community wealth.
- source: `DMG`

## Goal

Two linked calculators on one page. The kingdom side turns area, density, and age into population, settlements, and castles. The town side turns a population into size, gp limit, total ready cash, racial mix, power centers, businesses, and a class-by-level table. Clicking the kingdom's largest settlement copies that population into the town calculator.

Numbers update as the user types. No Generate button, except Reroll on the random pieces (power centers, and the 0.4-1.6 business fudge). Those use the seed.

## Kingdom

Inputs:

- Kingdom name, text. Default a blank field. Placeholder is not the label.
- Area in square miles. Default `2d100 * 1000` rolled once on first render from the seed.
- Density, people per square mile: Desolate 20, Low 40, Settled 60, Average 80, High 100, Maximum 120.
- Age in years. Default `2d100 * 10` from the same seed.

Population = area times density.

Land use, displayed near the population: cultivated fraction = `density / 180 + 0.1 * rng.next()` capped at 0.95. Wilderness is the rest. Show percent and square miles.

Settlements:

- Largest population = `floor(sqrt(population) * (2d4 + 10))`.
- Second = `floor(largest / 100 * (2d4 * 10))`.
- If largest is above 8000, the settlement is a city. Count further cities by halving the second population with `second = second / 100 * (100 - 2d4 * 5)` while it stays above 8000. Towns of note = `(2 + extraCities) * 2d8`, or `2 * 2d8` when there are no extra cities.
- If largest is 8000 or below, it is a town, and the note is "There are no other towns of note in the kingdom."

Castles, from population and age:

- Active = `floor(population / 50000)`.
- Ruined = `floor(population / 5000000 * sqrt(age))`.
- Active in the wilderness = `floor(active / 100 * (2d4 * 5))`. The rest are in settled land.
- Ruined in the wilderness uses the same split. Never show a negative. If wilderness exceeds the total, clamp.

## Town

Inputs: town name, population. Buttons under the kingdom card set population to the largest settlement, to 8000 (a city), to a town roll `(1d7 * 1000) + 1d1000`, or to a village roll. Village roll: half the time `(1d5 * 50) + 1d50`, otherwise `(1d49 * 20) + 1d20`.

Size label from population, for the kingdom-style sentence: above 8000 city, above 1000 town, otherwise village.

DMG size and gp limit, used for the wealth line. This is separate from the city/town/village sentence above.

| Population | Key | gp limit | Power-center modifier | Level modifier | Power-center rolls |
|---|---|---|---|---|---|
| 20-80 | thorp | 40 | -1 | -3 | 1 |
| 81-400 | hamlet | 100 | 0 | -2 | 1 |
| 401-900 | village | 200 | +1 | -1 | 1 |
| 901-2000 | small town | 800 | +2 | 0 | 1 |
| 2001-5000 | large town | 3000 | +3 | +3 | 1 |
| 5001-12000 | small city | 15000 | +4 | +6 | 2 |
| 12001-25000 | large city | 40000 | +5 | +9 | 3 |
| 25001+ | metropolis | 100000 | +6 | +12 | 4 |

Ready cash = `floor(gpLimit / 2 * (population / 10))`.

Racial mix and primary race. Primary race is one of Human, Dwarf, Elf, Gnome, Half-elf, Half-orc, Halfling. Mix:

- Isolated: 96, 2, 1. The 96 is the primary race. The other two percents go to the next races in this fixed order, skipping the primary: Human, Halfling, Elf, Dwarf, Gnome, Half-elf, Half-orc.
- Mixed: 79, 9, 5, 3, 2, 1, 1.
- Integrated: 37, 20, 18, 10, 7, 5, 3.

Show "96% humans, 2% halflings, and 1% elves" with the right plurals: humans, halflings, elves, dwarves, gnomes, half-elves, half-orcs. If the list is shorter than the order, the leftover races are "other races" with the remaining percent.

Power centers. For each roll (1 to 4 from the table): d20 + modifier. 19-20 magical, 14-18 nonstandard, otherwise conventional. Alignment, d100: 1-35 lawful good, 36-39 neutral good, 40-41 chaotic good, 42-61 lawful neutral, 62-63 true neutral, 64 chaotic neutral, 65-90 lawful evil, 91-98 neutral evil, 99-100 chaotic evil. 5% of conventional centers also add a monstrous center with its own alignment roll.

Display each center as a short original sentence: "Conventional center, lawful good." Write one sentence template per kind (conventional, nonstandard, magical, monstrous).

## Classes by level

Population is spent on NPCs. Classes and their highest-level dice:

| Class | Level dice | Percent of population forced to 1st level |
|---|---|---|
| Barbarian | 1d4 | |
| Bard | 1d6 | |
| Cleric | 1d6 | |
| Druid | 1d6 | |
| Fighter | 1d8 | |
| Monk | 1d4 | |
| Paladin | 1d3 | |
| Ranger | 1d3 | |
| Rogue | 1d8 | |
| Sorcerer | 1d4 | |
| Wizard | 1d4 | |
| Adept | 1d6 | 0.5 |
| Aristocrat | 1d4 | 0.5 |
| Commoner | 4d4 | 91 |
| Expert | 3d4 | 3 |
| Warrior | 2d4 | 5 |

For each class, roll the level dice once per power-center-roll count (minimum 1). Add the town's level modifier. That is the highest level, minimum 1, maximum 20.

Then walk down: at the rolled level, add 1 NPC if the level is above 0 and at most 20. Halve the level (floor) and double the count, and repeat, subtracting the NPCs from the remaining population. Stop when the level drops to 0 or below, or the population is exhausted.

Classes with a 1st-level percent then set level 1 to `round(percent / 100 * remainingPopulation)` after the higher levels are placed. Commoner level 1 receives whatever population is left, even if that makes commoners the bulk of the town.

Render a table: rows are classes that have at least one NPC, columns are levels 1 through 20. Empty cells are blank. Do not use `&nbsp;` in React. Use an empty string and a muted cell class.

## Businesses

One row per trade. Count = `floor(population / ratio * fudge)` where fudge = `0.4 + 1.2 * rng.next()`. If the raw value is below 1, the count is 1 when `rng.next() < raw`, otherwise 0.

Ratios: Bakers 800, Barbers 350, Bathers 1900, Beer-sellers 1400, Blacksmiths 1500, Bleachers 2100, Bookbinders 3000, Booksellers 6300, Buckle makers 1400, Butchers 1200, Carpenters 550, Chandlers 700, Chicken butchers 1000, Coopers 700, Copyists 2000, Cutlers 2300, Doctors 1700, Fishmongers 1200, Furriers 250, Glovemakers 2400, Harness-makers 2000, Hatmakers 950, Hay merchants 2300, Illuminators 3900, Inns 2000, Jewelers 400, Locksmiths 1900, Magic shops 2800, Maidservants 250, Masons 500, Mercers 700, Old-clothes dealers 400, Painters 1500, Pastrycooks 500, Plasterers 1400, Pursemakers 1100, Roofers 1800, Ropemakers 1900, Rugmakers 2000, Saddlers 1000, Scabbardmakers 850, Sculptors 2000, Shoemakers 150, Spice merchants 1400, Tailors 250, Tanners 2000, Taverns 400, Watercarriers 850, Weavers 600, Wine-sellers 900, Woodcarvers 2400, Woodsellers 2400.

Also show, from the same fudge function: nobles `population/200`, guards `population/150`, advocates `population/650`, clergy `population/40`, priests `population/1000`.

Hide trades with count 0 behind a disclosure "Show empty trades", default closed.

## UI

Two cards. Kingdom card first, town card second. Use `.page-header` once. Cards are `section` elements with an `h2`.

Class prefix: `.demographics`.

Format large numbers with comma separators. Square miles get the same treatment.

## Tests

- Population 100 by 80 density on area 100 is 8000. Test the pure function.
- gp limit for 50 people is 40. For 30000 it is 100000.
- Isolated human mix is 96 human, 2 halfling, 1 elf.
- A class walk with a fixed "die" of 4, modifier 0, and a large population places 1 at level 4, 2 at level 2, and does not place level 3. Inject the die roller.
- Ready cash for a thorp of 40 people is `floor(40 / 2 * 4)` = 80.
- Castle wilderness split never exceeds the active count.

## Acceptance

- Both cards render and the largest-settlement button fills town population.
- Tests and typecheck pass.

## Suggested commit

`feat(demographics): add kingdom and town calculators`
