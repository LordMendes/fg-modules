import json
from collections import Counter
from pathlib import Path

data = json.loads(
    Path(r"C:\Users\User\Documents\fg-modules\dndtools-reference\data\dndtools\spells.json").read_text(
        encoding="utf-8"
    )
)
counts = Counter()
levels = Counter()
names = []
for spell in data:
    for entry in spell.get("classes") or []:
        if (entry.get("name") or "") == "Dread Necromancer":
            abbrev = ((spell.get("source") or {}).get("abbrev")) or "?"
            counts[abbrev] += 1
            levels[entry.get("level")] += 1
            names.append((entry.get("level"), spell.get("name"), abbrev))
print("by source", counts)
print("by level", dict(sorted(levels.items())))
print("count", len(names))
for row in sorted(names, key=lambda r: (r[0] if isinstance(r[0], int) else 99, r[1] or ""))[:15]:
    print(row)
