---
name: escalation-map-json
description: Generates JSON to import into the campaign wiki Escalation Map. Use when the user asks to map consequences of a player action, mentions "escalation map", or wants to pre-fill the tool with escalation results and exit ramps for a specific scene or session.
disable-model-invocation: true
---

# JSON generation — Escalation Map

Generates valid JSON to paste into the **Import / Export JSON** field of the wiki tool `/tools/mapa-escalada`.

## Required format

```json
{
  "title": "Scene or action title",
  "columns": [
    {
      "possibleResults": ["result 1", "result 2"],
      "exitRamps": ["exit 1", "exit 2"]
    },
    {
      "possibleResults": ["result 1", "result 2"],
      "exitRamps": ["exit 1", "exit 2"]
    },
    {
      "possibleResults": ["result 1", "result 2"],
      "exitRamps": ["exit 1", "exit 2"]
    },
    {
      "possibleResults": ["result 1", "result 2"],
      "exitRamps": ["exit 1", "exit 2"]
    }
  ]
}
```

- `title`: string — name of the mapped action or scene.
- `columns`: fixed array of **4 objects**, one per time window (mandatory order below).
- Missing trailing columns are filled empty by the tool — sending fewer than 4 is valid.
- `title` may be omitted; current map title is kept.
- Each list item may be a **string** or object **`{ "text": "…", "checked": false }`** (`checked` = happened at the table; when generating new content leave `false`).

## Columns — order and meaning

| Index | Window | What to map |
|---|---|---|
| 0 | **Initial Action** | The concrete player action and its immediate direct effects |
| 1 | **Immediate (minutes)** | Chain reactions within the same scene — guards, present NPCs, protocols |
| 2 | **Short Term (hours)** | How information spreads; new factions entering; investigations opened |
| 3 | **Long Term (days+)** | Impact on power groups, precedents, permanent relationships |

## Each column's sections

- **`possibleResults`**: what may happen (consequences, not guarantees). 2–4 items per column.
- **`exitRamps`**: ways to de-escalate or redirect without breaking the plot. 2–3 items per column.

## Process

1. Identify the **initial action** described by the user.
2. For each time window, list 2–3 realistic possible results given the scenario.
3. For each window, create 2 escalation exits: one that preserves the plot, one that opens a new narrative direction.
4. Generate the JSON and, if useful, add one comment line per column explaining the logic.

## Example

**Input:** "The players attacked the counselor during peace negotiations."

**Output:**

```json
{
  "title": "Attack on counselor during negotiations",
  "columns": [
    {
      "possibleResults": ["Combat starts in the room", "Guards restrain the group"],
      "exitRamps": ["Counselor laughs and uses the incident to their advantage", "Captain of the guard calls for an urgent pause"]
    },
    {
      "possibleResults": ["Reinforcements arrive", "Area sealed; no one leaves"],
      "exitRamps": ["Captain offers a deal: expose counselor conspiracy", "Counselor's rival appears as unexpected ally"]
    },
    {
      "possibleResults": ["Capture order issued", "Negotiations suspended indefinitely"],
      "exitRamps": ["Underground movement contacts group to expose counselor", "New neutral mediator offers to restart negotiations"]
    },
    {
      "possibleResults": ["Peace fails; tension rises", "Counselor gains more power"],
      "exitRamps": ["Crisis opens space for alternative peace led by the group", "Faction opposed to counselor gains strength — new political window"]
    }
  ]
}
```
