---
name: risk-matrix-json
description: Generates assessment JSON to import into the campaign wiki Risk Matrix. Use when the user asks to evaluate a player group or plot with the risk matrix, mentions "risk matrix", asks for ratings for a session, or wants to pre-fill the tool with values for a specific campaign or session.
disable-model-invocation: true
---

# JSON generation — Risk Matrix

Generates valid JSON to paste into the **Import / Export JSON** field of the wiki tool `/tools/matriz-risco`.

## Required format

```json
{
  "player": {
    "combate": 1,
    "advogado": 1,
    "coesao": 1,
    "resolucao": 1,
    "investimento": 1
  },
  "plot": {
    "sobrevivenciaNpc": 1,
    "locais": 1,
    "cronograma": 1,
    "informacao": 1,
    "recursos": 1
  }
}
```

All values: integer **1 to 5**. Missing keys keep the tool's current value — emit only keys the user asked to rate.

## Scale

- **1** — rarely happens / very flexible element
- **3** — sometimes happens / moderately important element
- **5** — almost always / absolutely critical element

## Dimensions — `player` (group behaviors)

| Key | What to evaluate |
|---|---|
| `combate` | How often the group resolves situations by force even when alternatives exist |
| `advogado` | How often they exploit rule loopholes or challenge DM rulings |
| `coesao` | How often the group splits and acts individually instead of collectively |
| `resolucao` | How often they prefer immediate action over investigation or negotiation |
| `investimento` | How often they engage with narrative hooks, backstory, and NPCs |

## Dimensions — `plot` (narrative elements)

| Key | What to evaluate |
|---|---|
| `sobrevivenciaNpc` | Does the plot stall if a specific NPC dies or disappears? |
| `locais` | Does the plot require a scene to happen at a specific location? |
| `cronograma` | Are there hard deadlines — do delays break narrative logic? |
| `informacao` | Must players discover something specific to advance? |
| `recursos` | Does the plot require specific items, money, or allies? |

## Process

1. Read the group or plot description provided by the user.
2. Assign a 1–5 value for each relevant dimension based on the criteria above.
3. If the user did not mention an element, omit the key (do not invent).
4. Generate the JSON and justify each rating in one short line below the block.

## Example

**User input:** "My group loves combat (always jump to a fight), rarely splits, and usually ignores narrative quests. The mission depends on a living NPC and discovering a secret code."

**Output:**

```json
{
  "player": {
    "combate": 5,
    "coesao": 2,
    "investimento": 1
  },
  "plot": {
    "sobrevivenciaNpc": 5,
    "informacao": 5
  }
}
```

Justifications:
- `combate 5` — always jump to a fight
- `coesao 2` — rarely splits
- `investimento 1` — ignores narrative quests
- `sobrevivenciaNpc 5` — mission stalls without the NPC
- `informacao 5` — no progress without the secret code
